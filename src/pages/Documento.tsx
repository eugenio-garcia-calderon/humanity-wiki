import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { subirArchivo } from '../utils/subir';
import SoltarImagen from '../components/ui/SoltarImagen';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Code2, Image as ImageIcon, Table2, Trash2, Globe, Lock,
  ChevronRight, Info, ChevronDown, Undo2, Redo2,
  LayoutTemplate, LayoutGrid,
  Download, Sparkles, Loader2, ArrowLeft, FileText, GripVertical, Boxes, Store,
  Search, X, Wand2, PenLine, Smile, Paperclip, Share2, Settings2, EyeOff, Eye, AlignLeft, ExternalLink, PenTool, MoreHorizontal, Maximize2, Minimize2,
  PanelTop, Bookmark, Link2, Play, Sigma, Keyboard, Unlock, Map as MapIcon, MousePointerClick, Navigation, RefreshCw, Unlink, Copy, CircleDashed,
} from 'lucide-react';
import SelectorBloques, { Flotante, type OpcionBloque } from '../components/knowledge/SelectorBloques';
import { useAuth } from '../contexts/AuthContext';
import { useEsMovil } from '../hooks/useEsMovil';
import Rejilla from '../components/tablas/Rejilla';
import WindowContent from '../components/knowledge/WindowContent';
import DialogoCompartir from '../components/knowledge/DialogoCompartir';
import HerramientasPagina from '../components/acceso/HerramientasPagina';
import BotonFavorito from '../components/espacio/BotonFavorito';
import AjustesPagina, { CLAVES_AJUSTES, type Ajustes } from '../components/knowledge/AjustesPagina';
import CreadorMenu from '../components/knowledge/CreadorMenu';
import ConsolaCadena from '../components/knowledge/ConsolaCadena';
import MenuBloque, { type OpcionExtra } from '../components/knowledge/MenuBloque';
import PropiedadesFila from '../components/tablas/PropiedadesFila';
import MenuEntradaPagina from '../components/tablas/MenuEntradaPagina';
import TextoEnriquecido from '../components/knowledge/TextoEnriquecido';
import { TarjetaMarcador, WebInsertada, leerEnlace } from '../components/knowledge/BloqueEnlace';
import { repintar, ponerCursor } from '../utils/marcadoVivo';
import EnlaceSubpagina from '../components/knowledge/EnlaceSubpagina';
import BloquePizarra from '../components/knowledge/BloquePizarra';
import { claseColor, PINTAN_SU_COLOR } from '../utils/coloresBloque';
import { LayoutCabecera, MandosCabecera, FilaTitulo, ladoIcono, letraDescripcion } from '../components/knowledge/CabeceraPagina';
import IconoElemento from '../components/ui/Icono';
import EditorImagen from '../components/knowledge/EditorImagen';
import { ImagenEditable, ImagenVista } from '../components/knowledge/ImagenBloque';
import {
  type Bloque, type TipoBloque, nuevoIdBloque, markdownABloques, bloquesAMarkdown, enFilas,
  AIRE_BASE_DATOS, aplanar, aArbol, normalizarNiveles, finSubarbol, esPlegable, esContenedor,
  type AccionBoton,
} from '../utils/bloques';
import { MigasDePan, BotonVista, ConfigBoton, conFecha } from '../components/knowledge/BloquesExtra';
import { usePresencia, CarasPresencia, type Persona } from '../components/knowledge/PresenciaPagina';
import { fusionarBloques } from '../utils/colaboracion';
import { useColab, type CallbacksEditor } from '../components/knowledge/useColab';
import type { InfoColab } from '../utils/colabCliente';
import { posTrasDelta, type Plano } from '../utils/colabTexto';
import { parchearBloque, estaComponiendo, leerSeleccion } from '../utils/colabDom';
import CursoresAjenos from '../components/knowledge/CursoresAjenos';
import type { PresenciaPersona } from '../utils/colabCliente';
import { leerPegado, tamanoLegible, idYoutube, idVimeo, enCampoDeTexto } from '../utils/pegado';
import PortadaPdf from '../components/ui/PortadaPdf';
import HojaCrear from '../components/navegacion/HojaCrear';
import {
  PreviaPagina, PreviaArchivos, PreviaTabla, PreviaPublicaciones, PreviaComercio,
} from '../components/bienvenida/previas';
import { abrirLateral } from '../components/ventanas/bus';
import { avisarMovimiento } from '../utils/avisoPaginas';
import { cn } from '../utils/cn';
import CrearProducto from '../components/knowledge/CrearProducto';
// La tabla de estilos de los bloques vive en el LECTOR, y el editor la
// importa de allí. Una sola definición: lo que se escribe y lo que se
// publica tienen que verse igual, y con dos copias el fallo sale siempre en
// la pantalla pública, que es la que nadie mira.
import { CLASES_TEXTO, marcaLista } from '../components/knowledge/BloquesLectura';
import Adjuntos from '../components/archivo/Adjuntos';
// @menciones, [[enlaces]] y «Enlazan aquí» (2026-10-06, carril editorB, #6).
import MencionesMenu from '../components/knowledge/MencionesMenu';
import EnlazanAqui from '../components/knowledge/EnlazanAqui';
import BloqueEmbed from '../components/knowledge/BloqueEmbed';
import Formula from '../components/knowledge/Formula';
import { embedDe, type Embed } from '../utils/embeds';
// Ajustes de página, buscar y atajos (2026-10-06, carril editorB, #29 y #30).
import BuscarEnPagina from '../components/knowledge/BuscarEnPagina';
import AtajosAyuda from '../components/knowledge/AtajosAyuda';
import { anchoDePagina, clasesDePagina, contarPagina } from '../utils/ajustesPagina';
import { detectarMencion, referenciasDe } from '../utils/menciones';

import { t as tr } from '../i18n';
import { guardarBorrador, leerBorrador, borrarBorrador, registrarEditorAbierto, hayRed } from '../utils/sinConexion';
// ============================================================================
// DOCUMENTO estilo Notion (2026-08-08, petición del usuario) — Fase 1
// ============================================================================
// Una página por documento (/paginas/:id). Tres modos:
//  - GENERÁNDOSE (/paginas/nuevo?prompt=…): la IA lo escribe en directo y
//    se ve aparecer, como pidió el usuario («según lo va generando aparece»).
//  - LECTURA: cualquiera con acceso lo lee.
//  - EDICIÓN: el autor (o un admin) edita en el sitio, con un «+» por línea
//    para insertar bloques, como en Notion.
//
// El texto vivo de cada bloque vive en el DOM (contentEditable) y en un ref,
// NO en estado de React: re-renderizar un contentEditable en cada tecla
// rompería el cursor. El estado solo guarda la ESTRUCTURA (qué bloques hay y
// de qué tipo); el autoguardado serializa estructura + refs.

// EL SELECTOR CON GRUPOS (2026-10-05): cada bloque dice a qué altura del
// selector va (`grupo`), una línea de qué hace (`desc`) y su color. El orden
// dentro de cada grupo es el orden en que se ve. Ver `SelectorBloques.tsx`.
// `video` y `mapa` no son tipos de bloque: son atajos —un vídeo acaba en un
// bloque `medio`, un mapa en un `publicacion`— y los resuelve `insertar`.
type TipoMenu = TipoBloque | 'video' | 'mapa' | 'plegable1' | 'plegable2' | 'plegable3';
const TIPOS_MENU: { tipo: TipoMenu; label: string; icon: any; grupo: OpcionBloque['grupo']; desc?: string; color?: string; claves?: string }[] = [
  // ── Básicos ──
  { tipo: 'parrafo', label: 'Texto', icon: Type, grupo: 'basico', color: 'bg-slate-100 text-slate-700', claves: 'parrafo escribir' },
  { tipo: 'titulo1', label: 'Titular', icon: Heading1, grupo: 'basico', color: 'bg-slate-900 text-white', claves: 'titulo 1 encabezado' },
  { tipo: 'imagen', label: 'Imagen', icon: ImageIcon, grupo: 'basico', color: 'bg-sky-100 text-sky-600', claves: 'foto' },
  { tipo: 'video', label: 'Vídeo', icon: Play, grupo: 'basico', color: 'bg-rose-100 text-rose-600', claves: 'youtube vimeo' },
  // Subir un archivo cualquiera (2026-09-30), desde el «+».
  { tipo: 'medio', label: 'Archivo', icon: Paperclip, grupo: 'basico', color: 'bg-amber-100 text-amber-700', claves: 'pdf subir documento' },
  // Un enlace como tarjeta (2026-10-02). Se llega también pegando un enlace.
  { tipo: 'marcador', label: 'Página web', icon: Bookmark, grupo: 'basico', color: 'bg-emerald-100 text-emerald-700', claves: 'enlace link marcador' },
  // ── Herramientas ──
  // La buena: columnas con tipo, fórmulas y relaciones.
  { tipo: 'basedatos', label: 'Base de datos', icon: Boxes, grupo: 'herramienta', color: 'bg-violet-100 text-violet-700', desc: 'Tabla, galería o tablero con columnas', claves: 'tabla galeria' },
  // La pizarra de «Esquemas», dentro de la página (2026-10-01).
  { tipo: 'pizarra', label: 'Pizarra', icon: PenTool, grupo: 'herramienta', color: 'bg-orange-100 text-orange-600', desc: 'Lienzo libre para dibujar y unir ideas', claves: 'esquema lienzo dibujo' },
  { tipo: 'mapa', label: 'Mapa', icon: MapIcon, grupo: 'herramienta', color: 'bg-teal-100 text-teal-700', desc: 'Inserta uno de tus mapas', claves: 'territorio' },
  // Una página dentro de ésta (2026-09-30), como en Notion.
  { tipo: 'subpagina', label: 'Página', icon: FileText, grupo: 'herramienta', color: 'bg-slate-100 text-slate-700', desc: 'Una página nueva dentro de esta', claves: 'subpagina' },
  // Un botón que hace algo (2026-10-05): insertar una plantilla, crear una
  // página o una fila, o abrir un enlace. Ver `ejecutarBoton`.
  { tipo: 'boton', label: 'Botón', icon: MousePointerClick, grupo: 'herramienta', color: 'bg-slate-900 text-white', desc: 'Inserta bloques, crea una página o abre un enlace', claves: 'button plantilla accion' },
  // El mismo contenido en varias páginas (2026-10-06, #22). Ver «BLOQUES
  // SINCRONIZADOS» más abajo.
  { tipo: 'sincronizado', label: 'Bloque sincronizado', icon: RefreshCw, grupo: 'herramienta', color: 'bg-orange-100 text-orange-600', desc: 'El mismo contenido en varias páginas', claves: 'synced sincronizar reutilizar' },
  // Contenido de terceros (2026-10-06, #20): Figma, Maps, Drive, Spotify, Loom…
  { tipo: 'embed', label: 'Contenido incrustado', icon: PanelTop, grupo: 'herramienta', color: 'bg-fuchsia-100 text-fuchsia-700', desc: 'Figma, Maps, Drive, Spotify, Loom, CodePen, X, Miro…', claves: 'embed figma maps mapa google drive docs slides spotify soundcloud loom codepen twitter x miro incrustar' },
  { tipo: 'web', label: 'Web insertada', icon: Globe, grupo: 'herramienta', color: 'bg-emerald-100 text-emerald-700', desc: 'Otra web entera, dentro de la página', claves: 'iframe embed' },
  { tipo: 'publicacion', label: 'Publicación', icon: LayoutTemplate, grupo: 'herramienta', color: 'bg-indigo-100 text-indigo-700', desc: 'Algo ya publicado en la plataforma', claves: 'embeber' },
  // ── Tienda (fase 2 de Comercio) ──
  { tipo: 'producto', label: 'Producto', icon: Store, grupo: 'tienda', color: 'bg-lime-100 text-lime-700', desc: 'Un producto con su precio' },
  { tipo: 'portada', label: 'Portada de tienda', icon: LayoutTemplate, grupo: 'tienda', color: 'bg-lime-100 text-lime-700', desc: 'La cabecera de tu tienda' },
  { tipo: 'rejilla', label: 'Rejilla de productos', icon: LayoutGrid, grupo: 'tienda', color: 'bg-lime-100 text-lime-700', desc: 'Varios productos en cuadrícula' },
  // ── Formato de texto ──
  { tipo: 'titulo2', label: 'Título 2', icon: Heading2, grupo: 'formato' },
  { tipo: 'titulo3', label: 'Título 3', icon: Heading3, grupo: 'formato' },
  { tipo: 'lista', label: 'Lista', icon: List, grupo: 'formato' },
  { tipo: 'numerada', label: 'Numerada', icon: ListOrdered, grupo: 'formato', claves: 'lista numerada' },
  { tipo: 'tarea', label: 'Casilla', icon: CheckSquare, grupo: 'formato', claves: 'tarea check' },
  { tipo: 'cita', label: 'Cita', icon: Quote, grupo: 'formato' },
  { tipo: 'desplegable', label: 'Desplegable', icon: ChevronRight, grupo: 'formato', claves: 'toggle' },
  // Títulos que pliegan lo de debajo (2026-10-05, los «toggle headings» de
  // Notion). No son un tipo: son un título con `plegable` (ver `insertar`).
  { tipo: 'plegable1', label: 'Título 1 desplegable', icon: Heading1, grupo: 'formato', claves: 'toggle heading titulo plegable' },
  { tipo: 'plegable2', label: 'Título 2 desplegable', icon: Heading2, grupo: 'formato', claves: 'toggle heading titulo plegable' },
  { tipo: 'plegable3', label: 'Título 3 desplegable', icon: Heading3, grupo: 'formato', claves: 'toggle heading titulo plegable' },
  { tipo: 'migas', label: 'Migas de pan', icon: Navigation, grupo: 'formato', claves: 'breadcrumb ruta madre' },
  { tipo: 'aviso', label: 'Aviso', icon: Info, grupo: 'formato', claves: 'callout' },
  { tipo: 'indice', label: 'Índice', icon: List, grupo: 'formato' },
  { tipo: 'codigo', label: 'Código', icon: Code2, grupo: 'formato' },
  // Una fórmula LaTeX con KaTeX (2026-10-06, #19). También: «$$ » al principio.
  { tipo: 'ecuacion', label: 'Ecuación', icon: Sigma, grupo: 'formato', claves: 'latex katex formula matematicas equation math' },
  { tipo: 'separador', label: 'Separador', icon: Minus, grupo: 'formato', claves: 'linea' },
  // La de texto se queda, y dice lo que es, para quien solo quiera una
  // rejilla de texto en un documento.
  { tipo: 'tabla', label: 'Tabla de texto', icon: Table2, grupo: 'formato' },
];

/*
 * EL CATÁLOGO CON DIBUJO (2026-08-25). Es TIPOS_MENU —la única lista de
 * bloques— vestido con las previsualizaciones de la portada. Derivarlo y no
 * copiarlo: si mañana entra un bloque nuevo en TIPOS_MENU, aparece aquí solo.
 * Los bloques de texto comparten el dibujo de página porque son formas de
 * escribir; repetir un dibujo cuando dos cosas se parecen de verdad es honesto.
 */
const PREVIA_DE: Record<string, () => any> = {
  imagen: PreviaArchivos, basedatos: PreviaTabla, tabla: PreviaTabla,
  publicacion: PreviaPublicaciones, producto: PreviaComercio,
  portada: PreviaComercio, rejilla: PreviaComercio,
};
const BLOQUES_HOJA = TIPOS_MENU.map(t => ({
  nombre: t.label, clave: t.tipo as string, Previa: PREVIA_DE[t.tipo] ?? PreviaPagina,
}));

const EMOJIS_ICONO = ['📄', '📊', '📚', '🌍', '🔥', '💧', '🌱', '🏛️', '💡', '🎯', '🧭', '🤝', '⚖️', '🛠️', '🗺️', '❤️'];

/** Marcado inline de markdown → nodos React (negrita, cursiva, código,
 *  enlaces y direcciones pegadas). El mismo pintor que la página publicada. */
/** De los estados de presencia de Yjs a las caras de arriba: una por persona. */
function carasDe(ps: PresenciaPersona[]): Persona[] {
  const por = new Map<string, Persona>();
  for (const p of ps) {
    const x = por.get(p.id);
    if (x) { x.pestanas++; x.edita = x.edita || p.edita; }
    else por.set(p.id, { id: p.id, nombre: p.nombre, avatar: p.avatar, color: p.color, edita: p.edita, pestanas: 1 });
  }
  return [...por.values()];
}

function Inline({ texto }: { texto: string }) {
  return <TextoEnriquecido texto={texto} />;
}

export default function Documento() {
  const { id } = useParams<{ id: string }>();
  // Comentarios anclados e historial de versiones (carril acceso, #11 y #8):
  // fuera del editor a propósito, para no tocar su estado.
  return <><EditorPagina key={id} />{id && <HerramientasPagina key={`h-${id}`} paginaId={id} />}</>;
}

function EditorPagina() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const esMovil = useEsMovil();

  const esNuevo = id === 'nuevo';
  const prompt = searchParams.get('prompt') || '';
  const conversationId = searchParams.get('conv') || undefined;

  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState<string | null>(null);
  /** Dónde se ve publicada: su dominio propio, o su dirección en Humanity Wiki. */
  const [urlPublicada, setUrlPublicada] = useState<string | null>(null);
  /** Si esta página es una fila de una base de datos: de cuál y dónde vive. */
  const [filaDe, setFilaDe] = useState<{ fila_id?: string; tabla_id?: string; tabla_titulo: string | null; padre: { id: string; titulo: string } | null } | null>(null);
  const [publico, setPublico] = useState(false);
  const [puedoEditar, setPuedoEditar] = useState(false);
  const [puedoGestionar, setPuedoGestionar] = useState(false);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  /** La presencia (se declara más abajo, tras `cargar`); el guardado la lee. */
  const presenciaRef = useRef<{ conexion: React.MutableRefObject<string | null> }>({ conexion: { current: null } });
  /** Cada tabla que cambió por fuera (otra persona): sube para volver a pintar
   *  sus celdas, cuyo texto es del DOM (ver `CeldaEditable`). */
  const [revTablas, setRevTablas] = useState<Record<string, number>>({});
  /** Cómo estaba el título en el servidor al abrir (la base de lo que se lleva sin enviar). */
  const tituloBase = useRef('');
  const ultimaMeta = useRef<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(esNuevo);
  const [guardado, setGuardado] = useState<'sí' | 'pendiente' | 'guardando' | 'sin conexión'>('sí');
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null); // id del bloque cuyo + está abierto
  /** El buscador está buscando PRODUCTOS, no publicaciones. */
  const [buscaProducto, setBuscaProducto] = useState(false);
  /** El buscador abierto desde «Mapa» (2026-10-05): sólo enseña mapas. */
  const [soloMapas, setSoloMapas] = useState(false);
  /** Bloques de web nacidos de «Vídeo»: piden un enlace de vídeo, no de web. */
  const videosPendientes = useRef(new Set<string>());

  // EL MENÚ DE LA BARRA «/» (2026-08-20, petición de Eugenio: «el shortcut de
  // "/" para añadir cosas, como en Notion […] y como hace este propio chat de
  // Claude Code»). Escribes «/» y se despliegan las posibilidades; sigues
  // escribiendo y se van filtrando; Enter o clic elige.
  //
  // Se apoya en lo que ya existe: filtra `TIPOS_MENU` y llama al mismo
  // `insertar`. No hay un catálogo nuevo que mantener en dos sitios.
  const [barra, setBarra] = useState<{ bloque: string; texto: string; elegido: number } | null>(null);
  const opcionesBarra = barra
    ? TIPOS_MENU.filter(t => {
        const q = barra.texto.trim().toLowerCase();
        if (!q) return true;
        return t.label.toLowerCase().includes(q) || t.tipo.includes(q);
      })
    : [];
  const [focoId, setFocoId] = useState<string | null>(null);
  // Edición estilo Typora: solo el bloque ACTIVO enseña el marcado markdown
  // en crudo (**negrita**); los demás se ven ya formateados aunque estés en
  // modo edición. Al pulsar uno, pasa a activo y se puede teclear.
  const [bloqueActivo, setBloqueActivo] = useState<string | null>(null);
  /** La hoja reciclada de «añadir a la página» (gran actualización 2026-08-25). */
  // Selección múltiple (2026-08-08, petición del usuario): Ctrl/Cmd+clic
  // marca bloques sueltos, Shift+clic marca el rango desde el último
  // marcado, y una barra flotante los elimina de golpe.
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const ultimoSeleccionado = useRef<string | null>(null);
  // Fase 2 —
  const [portada, setPortada] = useState<string | null>(null);
  const [icono, setIcono] = useState<string | null>(null);
  /** Ajustes de publicación (autor, fecha, ancho, descripción, imagen). */
  const [ajustes, setAjustes] = useState<Ajustes>({});
  const [ajustesAbierto, setAjustesAbierto] = useState(false);
  /** Buscar en la página (⌘F propio) y la lista de atajos («?»). */
  const [buscando, setBuscando] = useState<{ q: string; senal: number } | null>(null);
  const [atajosAbiertos, setAtajosAbiertos] = useState(false);
  const [menuSitioAbierto, setMenuSitioAbierto] = useState(false);
  const [consolaAbierta, setConsolaAbierta] = useState(false);
  /** Los mandos de «Diseño de la cabecera» a la vista. */
  const [disenoAbierto, setDisenoAbierto] = useState(false);
  /** Recién pulsado «Añadir descripción»: el cursor va a ella. */
  const [focoDescripcion, setFocoDescripcion] = useState(false);
  const [eligiendoIcono, setEligiendoIcono] = useState(false);
  // El diálogo de pegar / arrastrar / subir la portada (2026-10-02).
  const [eligiendoPortada, setEligiendoPortada] = useState(false);
  // ══ ARRASTRAR BLOQUES CON EL PUNTERO (2026-09-30) ══════════════════════
  // Antes era el arrastrar-y-soltar nativo del navegador, y sobre bloques
  // editables el navegador intenta soltar TEXTO dentro del bloque de debajo:
  // Eugenio, «cuando se arrastra un bloque por encima de otro no se queda en
  // la nueva posición». Con eventos de puntero lo decide esta página entera,
  // y de paso se puede soltar a un LADO para ponerlos en columnas.
  const [arrastre, setArrastre] = useState<{ id: string; x: number; y: number } | null>(null);
  const [destino, setDestino] = useState<{ id: string; lado: 'arriba' | 'abajo' | 'izquierda' | 'derecha' } | null>(null);
  const destinoRef = useRef<typeof destino>(null);
  const arrastrando = arrastre?.id ?? null;
  /** El bloque cuyo menú del asa ⋮⋮ está abierto. */
  const [menuAsa, setMenuAsa] = useState<string | null>(null);
  /** El botón cuyo panel de configuración está abierto, y el que se está
   *  ejecutando (crear una página o una fila tarda un momento). */
  const [configBoton, setConfigBoton] = useState<string | null>(null);
  const [botonOcupado, setBotonOcupado] = useState<string | null>(null);
  /** Aviso de abajo con «Deshacer». */
  const [aviso, setAviso] = useState<string | null>(null);
  /** ══ UN FALLO AL HACER ALGO NO ES UN FALLO DE LA PÁGINA (2026-10-01) ════
   *  Eugenio subió una imagen, falló la red, y el editor ENTERO se cambió por
   *  una pantalla de error cuyo botón llevaba a Explorar: perdió de vista su
   *  página. Subir, pegar, soltar o pedir algo a la IA que falla se dice aquí,
   *  en un aviso rojo encima de la página, y la página sigue donde estaba.
   *  La pantalla de error queda sólo para cuando la página no se puede abrir. */
  const [fallo, setFallo] = useState<string | null>(null);
  const falloTimer = useRef<any>(null);
  const fallar = (texto: string | null) => {
    setFallo(texto);
    clearTimeout(falloTimer.current);
    if (texto) falloTimer.current = setTimeout(() => setFallo(null), 8000);
  };
  const avisoTimer = useRef<any>(null);
  // ══ DESHACER Y REHACER, COMO NOTION (2026-10-05) ════════════════════════
  // Antes ⌘Z sólo deshacía lo de estructura (borrar, mover…) y lo tecleado lo
  // deshacía el navegador, bloque a bloque y a su manera: al pasar a otro
  // bloque se perdía. Ahora hay UNA historia para todo, con fotos de la página
  // entera (estructura + texto de cada bloque):
  //  - `presente` es la foto de cómo está la página ahora mismo. Se renueva
  //    tras cada cambio, sea una tecla o un bloque movido.
  //  - antes de un cambio, la foto de antes va a `pilaDeshacer`.
  //  - LAS TECLAS SE AGRUPAN, como en Notion: escribir una frase seguida es
  //    UN paso, no cuarenta. Un grupo se cierra al pararse un segundo, al
  //    cambiar de bloque, al hacer algo de estructura, o —si se escribe sin
  //    parar— en el primer espacio pasados cuatro segundos, para no deshacer
  //    un párrafo entero de golpe.
  // Las fotos son la lista plana con sus textos (lo mismo que se guarda), así
  // que deshacer es sencillamente volver a poner una foto.
  type Foto = { bloques: Bloque[]; foco: { id: string; pos: number | null } | null };
  const pilaDeshacer = useRef<Foto[]>([]);
  const pilaRehacer = useRef<Foto[]>([]);
  const presente = useRef<Foto | null>(null);
  const grupoTexto = useRef<{ id: string; desde: number; ultima: number } | null>(null);
  /** El próximo cambio de estructura no lo ha hecho quien escribe (abrir la
   *  página, deshacer, lo que llega de otra pestaña): no se apila. */
  const sinRegistrar = useRef(false);
  /** Sube al deshacer: obliga a volver a montar el bloque que se está
   *  escribiendo, cuyo texto es del DOM (ver `BloqueEditable`). */
  const [revision, setRevision] = useState(0);
  /** Cuántos pasos hay para atrás y para delante (para los botones). */
  const [pasos, setPasos] = useState({ atras: 0, adelante: 0 });
  const contarPasos = () => setPasos({ atras: pilaDeshacer.current.length, adelante: pilaRehacer.current.length });
  const archivoRef = useRef<HTMLInputElement>(null);
  const archivoTras = useRef<string | null>(null);
  /** Hay un archivo del escritorio volando sobre el documento (2026-08-22).
   *  Se pinta un borde para decir «suéltalo aquí»: sin señal, arrastrar algo
   *  encima de una página es probar a ver si pasa algo. */
  const [archivoEncima, setArchivoEncima] = useState(false);
  /** Qué bloque tiene abierto su menú de tres puntos. */
  const [menuMedio, setMenuMedio] = useState<string | null>(null);
  const [creandoProducto, setCreandoProducto] = useState(false);
  const [buscadorPub, setBuscadorPub] = useState<string | null>(null);   // id del bloque tras el que insertar ('' = al final)
  const [busquedaPub, setBusquedaPub] = useState('');
  const [resultadosPub, setResultadosPub] = useState<any[]>([]);
  const [iaOcupada, setIaOcupada] = useState<string | null>(null);       // 'continuar' | id del bloque
  const [menuDescargar, setMenuDescargar] = useState(false);
  const [compartirAbierto, setCompartirAbierto] = useState(false);
  // Editor de imágenes sobre un bloque imagen: id del bloque en edición.
  const [imagenEditando, setImagenEditando] = useState<string | null>(null);
  /** Aviso mientras sube lo pegado (2026-08-19). Un vídeo de 40 MB tarda, y
   *  sin aviso parece que el documento se ha quedado colgado. */
  const [subiendo, setSubiendo] = useState<string | null>(null);
  // Contenido real de las ventanas embebidas, cargado en vivo una sola vez.
  const [ventanasEmbebidas, setVentanasEmbebidas] = useState<Record<string, any>>({});

  // Texto vivo de cada bloque (y celdas de tabla), fuera del estado de React.
  const textosRef = useRef<Record<string, string>>({});
  const filasRef = useRef<Record<string, string[][]>>({});
  const docId = useRef<string | null>(esNuevo ? null : id || null);
  const timerGuardado = useRef<any>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // Carga normal (documento existente)
  // --------------------------------------------------------------------------
  // ── EDITAR SIN CONEXIÓN (#33, `utils/sinConexion.ts`) ──────────────────────
  // Si esta página tiene un borrador sin enviar, se recupera aquí. Sin red y sin
  // copia del servicio de trabajo, se abre el propio borrador: lo único que hay.
  const recuperadoDeBorrador = useRef(false);
  const cargar = useCallback((winId: string) => {
    fetch(`/api/windows/${winId}`, { credentials: 'include' })
      .then(async r => {
        let j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se ha podido cargar.');
        tituloBase.current = j.title || '';
        const bor = await leerBorrador(winId);
        // La BASE de la próxima fusión es lo que tiene el servidor, no el borrador.
        let baseServidor: Bloque[] | null = null;
        if (bor && !bor.error) {
          baseServidor = aplanar(j.config?.bloques || []);
          const mio = aplanar(bor.config?.bloques || []);
          const fusion = j.version === bor.versionBase ? mio : fusionarBloques(bor.base || [], mio, baseServidor).bloques;
          j = { ...j, title: bor.titulo, config: { ...(j.config || {}), ...bor.config, bloques: aArbol(fusion) } };
          recuperadoDeBorrador.current = true;
        }
        setTitulo(j.title || '');
        setFilaDe(j.fila_de || null);
        setAutor(j.autor_nombre || null);
        setPublico(!!j.publico);
        setPuedoEditar(!!j.puedo_editar);
        setPuedoGestionar(!!j.puedo_gestionar);
        setPortada(j.config?.portada || null);
        setIcono(j.config?.icono || null);
        const aj: Ajustes = {};
        for (const k of CLAVES_AJUSTES) if (j.config?.[k] !== undefined) (aj as any)[k] = j.config[k];
        setAjustes(aj);
        ultimaMeta.current = JSON.stringify({ ...aj, portada: j.config?.portada || undefined, icono: j.config?.icono || undefined });
        // Lo guardado es un árbol; el editor trabaja con la lista plana.
        let bs: Bloque[] = aplanar(j.config?.bloques || []);
        // Documentos guardados antes del arreglo del título duplicado: si el
        // primer bloque es un H1 idéntico al título, se omite (y el próximo
        // autoguardado lo retira del todo).
        if (bs[0]?.tipo === 'titulo1' && bs[0].texto?.trim() === (j.title || '').trim()) bs = bs.slice(1);
        for (const b of bs) {
          if (b.texto !== undefined) textosRef.current[b.id] = b.texto;
          if (b.filas) filasRef.current[b.id] = b.filas;
        }
        // La versión con la que se parte y cómo estaba la página: sin ellas no
        // se puede detectar que alguien guardó entretanto ni fusionar.
        versionBase.current = typeof j.version === 'number' ? j.version : null;
        bloquesBase.current = (baseServidor ?? bs).map(x => ({ ...x }));
        // Abrir (o volver a leer lo que cambió la IA) no es algo que se deshaga.
        sinRegistrar.current = true;
        setRevision(r => r + 1);
        setBloques(bs.length ? normalizarGrupos(bs) : [{ id: nuevoIdBloque(), tipo: 'parrafo', texto: '' }]);
        // Lo último de cada bloque sincronizado: la copia de la página puede
        // ser de antes de que se editara en otra.
        refrescarSincRef.current(bs);
      })
      .catch(async e => {
        // Sin red y sin copia guardada del servidor: si hay borrador, se abre ese.
        const bor = await leerBorrador(winId).catch(() => null);
        if (bor && !bor.error && !hayRed()) {
          const bs: Bloque[] = aplanar(bor.config?.bloques || []);
          for (const b of bs) { if (b.texto !== undefined) textosRef.current[b.id] = b.texto; if (b.filas) filasRef.current[b.id] = b.filas; }
          setTitulo(bor.titulo || ''); setPuedoEditar(true); setPortada(bor.config?.portada || null); setIcono(bor.config?.icono || null);
          const aj: Ajustes = {};
          for (const k of CLAVES_AJUSTES) if (bor.config?.[k] !== undefined) (aj as any)[k] = bor.config[k];
          setAjustes(aj);
          versionBase.current = bor.versionBase;
          bloquesBase.current = (bor.base || bs).map(x => ({ ...x }));
          sinRegistrar.current = true;
          setRevision(r => r + 1);
          setBloques(bs.length ? normalizarGrupos(bs) : [{ id: nuevoIdBloque(), tipo: 'parrafo', texto: '' }]);
          recuperadoDeBorrador.current = true;
          setGuardado('sin conexión');
        } else setError(e.message);
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!esNuevo && id) { setCargando(true); cargar(id); }
  }, [esNuevo, id, cargar]);

  // ── LA IA SABE QUÉ PÁGINA ESTÁS EDITANDO (2026-10-02) ───────────────────
  // Se anuncia al chat (`AIAssistant` la manda al servidor, que la lee con
  // sus permisos) y se escucha lo que la IA cambie, para enseñarlo sin
  // recargar. `versionDatos` remonta las bases de datos de la página cuando
  // la IA les añade una entrada.
  const [versionDatos, setVersionDatos] = useState(0);
  useEffect(() => {
    if (esNuevo || !id || !puedoEditar) return;
    window.dispatchEvent(new CustomEvent('humanity:pagina-abierta', { detail: { id } }));
    return () => { window.dispatchEvent(new CustomEvent('humanity:pagina-abierta', { detail: { id: null } })); };
  }, [esNuevo, id, puedoEditar]);

  // La dirección publicada se pregunta a quien arma las direcciones
  // (`compartir.ts`), para que el botón y la caja de compartir digan lo mismo.
  // Se vuelve a preguntar al cambiar la visibilidad: publicar asigna el nombre.
  useEffect(() => {
    if (!publico || !id || esNuevo) { setUrlPublicada(null); return; }
    let vivo = true;
    fetch(`/api/compartir/pagina/${id}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!vivo || !j) return;
        const dom = (j.dominios || []).find((d: any) => d.estado === 'activo');
        // Sin nombre corto (publicada sin elegir dirección) se ve igual por
        // `/@quien/p/:id`, la puerta que sirve cualquier página visible.
        setUrlPublicada(dom ? `https://${dom.dominio}`
          : j.urls?.corta
          || (j.handle ? `https://${j.handle}.humanity.wiki/p/${id}` : null));
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [publico, id, esNuevo]);

  // --------------------------------------------------------------------------
  // Generación en directo (/paginas/nuevo?prompt=…)
  // --------------------------------------------------------------------------
  const yaGenerado = useRef(false);
  useEffect(() => {
    if (!esNuevo || !prompt || yaGenerado.current) return;
    yaGenerado.current = true;
    setCargando(false);
    let buffer = '';
    let ultimaPintada = 0;

    (async () => {
      try {
        const res = await fetch('/api/ai/documento', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, conversation_id: conversationId }),
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'No se ha podido generar el documento.');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let crudo = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          crudo += decoder.decode(value, { stream: true });
          const trozos = crudo.split('\n\n');
          crudo = trozos.pop() || '';
          for (const trozo of trozos) {
            const evento = (trozo.match(/^event: (\w+)/m) || [])[1];
            const dato = (trozo.match(/^data: (.*)$/m) || [])[1];
            if (!evento || !dato) continue;
            const j = JSON.parse(dato);
            if (evento === 'inicio') docId.current = j.id;
            else if (evento === 'delta') {
              buffer += j.t;
              // Repintar como mucho ~6 veces por segundo: parsear markdown en
              // cada token sería malgastar y parpadear.
              if (Date.now() - ultimaPintada > 160) {
                ultimaPintada = Date.now();
                sinRegistrar.current = true;
                setBloques(aplanar(markdownABloques(buffer)));
                finalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }
            } else if (evento === 'fin') {
              setGenerando(false);
              navigate(`/paginas/${j.id}`, { replace: true });
              return;
            } else if (evento === 'error') {
              throw new Error(j.error);
            }
          }
        }
        // El servidor cerró sin `fin`: si al menos hay id, se abre lo guardado.
        if (docId.current) navigate(`/paginas/${docId.current}`, { replace: true });
      } catch (e: any) {
        setGenerando(false);
        setError(e.message);
      }
    })();
  }, [esNuevo, prompt, conversationId, navigate]);

  // --------------------------------------------------------------------------
  // Guardado (estructura del estado + textos vivos de los refs)
  // --------------------------------------------------------------------------
  // El temporizador del autoguardado dispara 1,2 s DESPUÉS del cambio: si
  // leyera el estado capturado en el cierre, guardaría lo de ANTES (el título
  // sin su última letra, la estructura sin el bloque recién insertado). Por
  // eso lee SIEMPRE de estos refs, que un efecto mantiene al día en cuanto
  // React aplica cada cambio de estado.
  const bloquesRef = useRef<Bloque[]>([]);
  const metaRef = useRef<{ titulo: string; portada: string | null; icono: string | null; ajustes: Ajustes }>({ titulo: '', portada: null, icono: null, ajustes: {} });
  useEffect(() => { bloquesRef.current = bloques; }, [bloques]);
  useEffect(() => { metaRef.current = { titulo, portada, icono, ajustes }; }, [titulo, portada, icono, ajustes]);

  const serializar = useCallback((): Bloque[] =>
    bloquesRef.current.map(b => ({
      ...b,
      texto: b.texto !== undefined || textosRef.current[b.id] !== undefined
        ? (textosRef.current[b.id] ?? b.texto ?? '') : undefined,
      filas: b.tipo === 'tabla' ? (filasRef.current[b.id] ?? b.filas ?? [['', ''], ['', '']]) : undefined,
    })), []);

  /** La foto de la página tal como está (ver «DESHACER Y REHACER»). */
  const fotoAhora = (): Foto => {
    const el = document.activeElement as HTMLElement | null;
    const id = el?.dataset?.bloque;
    return { bloques: serializar(), foco: id ? { id, pos: offsetCaret(el!) } : null };
  };
  const apilar = (foto: Foto) => {
    pilaDeshacer.current.push(foto);
    if (pilaDeshacer.current.length > 200) pilaDeshacer.current.shift();
    // Un cambio nuevo hace imposible el «rehacer» de antes, como en todas partes.
    pilaRehacer.current = [];
    contarPasos();
  };

  // ══ LOS DESPLEGABLES CERRADOS, EN EL EDITOR (2026-10-05) ════════════════
  // Qué desplegables (y títulos plegables) tiene cerrados quien escribe. Es
  // cosa de la pantalla, no de la página: no se guarda. Lo que ve quien lee
  // al llegar lo decide `abierto`, que se cambia desde el menú del asa.
  const [plegados, setPlegados] = useState<Set<string>>(() => new Set());
  const plegadosRef = useRef(plegados);
  plegadosRef.current = plegados;
  const plegar = (bid: string) => setPlegados(p => { const n = new Set(p); if (n.has(bid)) n.delete(bid); else n.add(bid); return n; });
  /** Abre los desplegables que esconden un bloque. */
  const abrirAncestros = (bs: Bloque[], bid: string) => {
    const i = bs.findIndex(x => x.id === bid);
    if (i < 0) return;
    let n = bs[i].nivel || 0;
    const abrir: string[] = [];
    for (let j = i - 1; j >= 0 && n > 0; j--) {
      if ((bs[j].nivel || 0) < n) { abrir.push(bs[j].id); n = bs[j].nivel || 0; }
    }
    if (abrir.some(a => plegadosRef.current.has(a))) setPlegados(p => { const s = new Set(p); abrir.forEach(a => s.delete(a)); return s; });
  };

  /** Los bloques que son la plantilla de un botón (sus hijos). */
  const enPlantilla = useMemo(() => {
    const s = new Set<string>();
    bloques.forEach((b, i) => { if (b.tipo === 'boton') for (let k = i + 1; k <= finSubarbol(bloques, i); k++) s.add(bloques[k].id); });
    return s;
  }, [bloques]);

  /** Lo que se ve: todo menos lo que hay dentro de un desplegable cerrado. */
  const visibles = useMemo(() => {
    const out: Bloque[] = [];
    let bajo: number | null = null;
    for (const b of bloques) {
      const n = b.nivel || 0;
      if (bajo !== null && n > bajo) continue;
      bajo = null;
      out.push(b);
      if (esContenedor(b) && plegados.has(b.id)) bajo = n;
    }
    return out;
  }, [bloques, plegados]);

  // ══ EDITAR A LA VEZ (2026-10-06): versión y fusión ═════════════════════
  // Ver `utils/colaboracion.ts`. `versionBase` es la versión que el servidor
  // tenía cuando se abrió o se guardó por última vez; `bloquesBase`, cómo
  // estaba entonces la página (la BASE de la fusión de tres vías).
  const versionBase = useRef<number | null>(null);
  const bloquesBase = useRef<Bloque[]>([]);
  const pendienteRemoto = useRef<{ version: number; por: string | null } | null>(null);

  /** ══ AVISAR A LAS PERSONAS NOMBRADAS, E INDEXAR LOS ENLACES (2026-10-06) ══
   *  Tras guardar, si lo que la página nombra (personas con @, páginas con
   *  [[ o enlaces internos) ha cambiado, se le dice al servidor, que lee la
   *  página guardada, avisa a quien falte y rehace «Enlazan aquí». También se
   *  repite mientras alguien nombrado siga sin poder ver la página. */
  const refsEnviadas = useRef<string | null>(null);
  const refsSinAcceso = useRef(false);
  const sincronizarReferencias = (bs: Bloque[]) => {
    const r = referenciasDe(aArbol(bs.map(b => ({ ...b, texto: b.texto !== undefined ? (textosRef.current[b.id] ?? b.texto) : b.texto }))), docId.current || '');
    const firmaRefs = JSON.stringify([[...r.personas].sort(), [...r.paginas].sort()]);
    // La primera vez sólo se apunta cómo estaba la página al abrirla.
    if (refsEnviadas.current === null) { refsEnviadas.current = firmaRefs; if (!r.personas.length) return; }
    if (firmaRefs === refsEnviadas.current && !refsSinAcceso.current) return;
    refsEnviadas.current = firmaRefs;
    fetch(`/api/paginas/${docId.current}/referencias`, { method: 'POST', credentials: 'include' })
      .then(x => x.ok ? x.json() : null)
      .then(j => {
        if (!j) return;
        refsSinAcceso.current = (j.sinAcceso || []).length > 0;
        if (j.sinAcceso?.length) avisar(`${j.sinAcceso.map((p: any) => p.nombre).join(', ')} no puede${j.sinAcceso.length > 1 ? 'n' : ''} ver esta página: no se le ha avisado. Compártela para que la vea.`);
        else if (j.avisados) avisar(j.avisados === 1 ? 'Aviso enviado a la persona nombrada' : `Aviso enviado a ${j.avisados} personas`);
      }).catch(() => {});
  };

  /** Los ajustes (portada, icono, publicación) no viajan por Yjs: van por el
   *  `PUT` de siempre, SIN bloques ni título (esos ya están en el documento). */
  const guardarMeta = async () => {
    const m = metaRef.current;
    const config = { ...m.ajustes, portada: m.portada || undefined, icono: m.icono || undefined };
    const f = JSON.stringify(config);
    if (ultimaMeta.current === null || f === ultimaMeta.current) return;
    const r = await fetch(`/api/windows/${docId.current}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, conexion: presenciaRef.current.conexion.current ?? undefined }),
    }).catch(() => null);
    if (r?.ok) ultimaMeta.current = f;
  };
  const guardarAhora = useCallback(async (estructura?: Bloque[]): Promise<void> => {
    if (!docId.current || !puedoEditar) return;
    if (colabRef.current && colabVivo()) {
      // EN VIVO: lo escrito sube a Yjs y el servidor guarda la página.
      colabRef.current.empujar({ titulo: metaRef.current.titulo, bloques: estructura ?? serializar() });
      await guardarMeta();
      await guardarSincRef.current(estructura ?? serializar());
      void borrarBorrador(docId.current);
      setGuardado('sí');
      return;
    }
    setGuardado('guardando');
    let bs = estructura ?? serializar();
    const meta = metaRef.current;
    const configDe = (lista: Bloque[]) => ({ ...meta.ajustes, bloques: aArbol(lista), portada: meta.portada || undefined, icono: meta.icono || undefined });
    const enviar = (lista: Bloque[]) => fetch(`/api/windows/${docId.current}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meta.titulo || 'Documento sin título',
        // Los ajustes van en la misma `config`: si no se mandaran, cada
        // guardado automático los borraría.
        // Se guarda como árbol: los hijos dentro de su madre (`aArbol`).
        config: configDe(lista),
        version_base: versionBase.current ?? undefined,
        conexion: presenciaRef.current.conexion.current ?? undefined,
      }),
    }).catch(() => null);
    // SIN RED (#33): ni se intenta (esperar el tiempo de espera de una petición
    // que no va a llegar deja «Guardando…» colgado); va directo al borrador.
    let r = hayRed() && !colabEsperando() ? await enviar(bs) : null;

    // 409: alguien guardó entretanto. Se fusiona (BASE, MÍO, SUYO) y se
    // vuelve a guardar; nada de lo que ha escrito el otro se pierde.
    if (r?.status === 409) {
      const j = await r.json().catch(() => ({}));
      const suyo = aplanar(j.config?.bloques || []);
      const { bloques: fusion, conflictos } = fusionarBloques(bloquesBase.current, bs, suyo);
      for (const x of fusion) { if (x.texto !== undefined) textosRef.current[x.id] = x.texto; if (x.filas) filasRef.current[x.id] = x.filas; }
      // Lo de los demás aparece en pantalla (no cuenta para deshacer).
      sinRegistrar.current = true;
      setRevision(n => n + 1);
      setBloques(normalizarNiveles(fusion));
      versionBase.current = typeof j.version === 'number' ? j.version : versionBase.current;
      bs = fusion;
      r = hayRed() ? await enviar(bs) : null;
      avisar(conflictos.length
        ? `${j.por || 'Otra persona'} cambió a la vez ${conflictos.length === 1 ? `«${conflictos[0].texto || 'un bloque'}»` : `${conflictos.length} bloques`}: se ha guardado tu versión.`
        : `${j.por || 'Otra persona'} guardó cambios mientras escribías: se han juntado los dos.`);
    }

    if (r?.ok) {
      const j = await r.clone().json().catch(() => ({}));
      if (typeof j.version === 'number') versionBase.current = j.version;
      bloquesBase.current = bs.map(x => ({ ...x }));
      await guardarSincRef.current(bs);
      sincronizarReferencias(bs);
      void borrarBorrador(docId.current!);
    } else if (!r) {
      // Sin conexión: lo escrito se guarda en este aparato (IndexedDB) y se
      // enviará al volver la red. El editor sigue funcionando.
      void guardarBorrador({
        pageId: docId.current!, titulo: meta.titulo || 'Documento sin título', config: configDe(bs),
        versionBase: versionBase.current, base: bloquesBase.current, guardadoEn: Date.now(),
      });
      setGuardado('sin conexión');
      return;
    }
    setGuardado(r?.ok ? 'sí' : 'pendiente');
  }, [puedoEditar, serializar]);

  const timerColab = useRef<any>(null);
  const programarGuardado = useCallback(() => {
    if (colabRef.current && colabVivo()) {
      // Sube a Yjs enseguida (lo de estructura, tablas…; el texto ya subió
      // con cada tecla) y se confirma «Guardado» a los instantes.
      setGuardado('guardando');
      clearTimeout(timerColab.current);
      timerColab.current = setTimeout(() => { void guardarAhoraRef.current(); }, 200);
      return;
    }
    setGuardado('pendiente');
    clearTimeout(timerGuardado.current);
    timerGuardado.current = setTimeout(() => guardarAhora(), 1200);
  }, [guardarAhora]);

  // Antes de que la IA lea la página, lo pendiente se guarda; y cuando la IA
  // la cambia, se vuelve a leer (lo pendiente ya está guardado, así que no se
  // pierde nada de lo escrito).
  useEffect(() => {
    const alLeer = () => {
      if (hayPendiente.current) { clearTimeout(timerGuardado.current); guardarAhora(); }
    };
    const alCambiar = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!docId.current) return;
      if (d.entityId === docId.current && !(colabRef.current && colabRef.current.estado !== 'abandonado')) { clearTimeout(timerGuardado.current); cargar(docId.current); }
      if (d.tabla_id && bloquesRef.current.some(b => (b as any).tabla_id === d.tabla_id)) setVersionDatos(v => v + 1);
    };
    window.addEventListener('humanity:ia-va-a-leer', alLeer);
    window.addEventListener('humanity:contenido-cambiado', alCambiar);
    return () => {
      window.removeEventListener('humanity:ia-va-a-leer', alLeer);
      window.removeEventListener('humanity:contenido-cambiado', alCambiar);
    };
  }, [guardarAhora, cargar]);

  // ── VUELVE LA RED (#33): lo guardado en el borrador se envía por el camino de
  // siempre —con `version_base` y su fusión si alguien guardó entretanto—. Y
  // mientras este editor está abierto, el reenvío global lo deja en paz.
  useEffect(() => {
    if (esNuevo || !id) return;
    const soltar = registrarEditorAbierto(id);
    const alVolver = () => { if (hayPendiente.current) { clearTimeout(timerGuardado.current); guardarAhoraRef.current(); } };
    window.addEventListener('online', alVolver);
    return () => { window.removeEventListener('online', alVolver); soltar(); };
  }, [esNuevo, id]);
  // El navegador puede creerse con red cuando el servidor no contesta (y no
  // dispara `online` al volver el servidor): mientras haya algo sin enviar, se
  // reintenta cada 15 s.
  useEffect(() => {
    if (guardado !== 'sin conexión') return;
    const t = setInterval(() => { if (hayRed()) guardarAhoraRef.current(); }, 15000);
    return () => clearInterval(t);
  }, [guardado]);
  // Se recuperó un borrador al abrir: se envía ya (si hay red) y se dice.
  useEffect(() => {
    if (cargando || !recuperadoDeBorrador.current) return;
    recuperadoDeBorrador.current = false;
    avisar(tr('Se han recuperado tus cambios hechos sin conexión.'));
    if (hayRed()) programarGuardado(); else setGuardado('sin conexión');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando]);

  // Al irse de la página (p. ej. a una tarjeta de su galería) lo que quedaba
  // por guardar se guarda YA, en vez de tirarse con el temporizador.
  const guardarAhoraRef = useRef(guardarAhora);
  guardarAhoraRef.current = guardarAhora;
  const hayPendiente = useRef(false);
  useEffect(() => { hayPendiente.current = guardado === 'pendiente' || guardado === 'sin conexión'; }, [guardado]);
  const sinGuardar = useRef(false);
  useEffect(() => { sinGuardar.current = guardado !== 'sí'; }, [guardado]);

  // ══ QUIÉN MÁS ESTÁ AQUÍ, Y «ALGUIEN HA GUARDADO» (2026-10-06) ═════════════
  // Si otra persona (u otra pestaña) guarda y aquí no hay nada sin guardar,
  // la página se pone al día sola. Si sí lo hay, no se toca nada: al guardar
  // se fusionan los dos (ver `guardarAhora`).
  const presencia = usePresencia(esNuevo ? null : id || null, puedoEditar && !generando, (version, por) => {
    if (version <= (versionBase.current ?? 0)) return;
    // En vivo, lo de los demás llega por Yjs: no se recarga la página.
    if (colabRef.current && colabRef.current.estado !== 'abandonado') { versionBase.current = version; return; }
    if (sinGuardar.current || !docId.current) return;
    // Un texto con el cursor dentro no se recarga bajo los dedos.
    if (document.activeElement && (document.activeElement as HTMLElement).dataset?.bloque) {
      pendienteRemoto.current = { version, por };
      return;
    }
    cargar(docId.current);
    avisar(`${por || 'Otra persona'} ha actualizado la página.`);
  });
  presenciaRef.current = presencia;

  // ══ EDICIÓN SIMULTÁNEA CON YJS (2026-10-06, carril colab) ═══════════════
  // Ver `utils/colabModelo.ts` (el diseño), `utils/colabCliente.ts` (la
  // conexión) y `colabServidor.ts`. Aquí sólo está lo que une al editor con
  // eso. Si la conexión no se puede (proxy, sin permiso) el estado pasa a
  // `abandonado` y TODO sigue como antes: autoguardado, 409 y fusión por bloque.
  const colabCb = useRef<CallbacksEditor>({ leerEditor: () => null, alRemoto: () => {} });
  const { colabRef, info: infoColab } = useColab({
    paginaId: esNuevo ? null : id || null,
    activo: !esNuevo && !cargando && !generando && !!user,
    base: () => ({ titulo: tituloBase.current, bloques: bloquesBase.current }),
    callbacks: colabCb,
  });
  /** La edición en vivo está funcionando: lo que se escribe ya viaja por
   *  Yjs y el servidor guarda; no hace falta el `PUT` de siempre. */
  const colabVivo = () => { const c = colabRef.current; return !!c && c.estado === 'vivo' && c.sincronizado; };
  /** Está conectando o reconectando: no se escribe por el camino de siempre
   *  (acabaría dos veces en el documento); lo escrito se queda en el
   *  documento y en el borrador de este aparato hasta que vuelva. */
  const colabEsperando = () => { const c = colabRef.current; return !!c && (c.estado === 'conectando' || c.estado === 'reconectando'); };
  const bloqueActivoRef = useRef<string | null>(null);
  bloqueActivoRef.current = bloqueActivo;
  const [pasosColab, setPasosColab] = useState({ atras: 0, adelante: 0 });
  /** Quién más está (con sus cursores) y a quién sigo. */
  const [personasColab, setPersonasColab] = useState<PresenciaPersona[]>([]);
  const [siguiendo, setSiguiendo] = useState<string | null>(null);
  const ultimaCaja = useRef<string | null>(null);

  // ══ MI PRESENCIA: DÓNDE ESTOY Y QUÉ TENGO SELECCIONADO (2026-10-06) ═════
  // El cursor viaja como posición relativa de Yjs (ver `CursoresAjenos`). En un
  // bloque que no es texto, lo que se comparte es el bloque donde se hizo clic
  // o el que se ha marcado.
  const publicarPresencia = () => {
    const c = colabRef.current;
    if (!c || c.estado !== 'vivo') return;
    const act = document.activeElement as HTMLElement | null;
    const el = act?.dataset?.bloque && docRef.current?.contains(act) ? act : null;
    if (el) {
      const id = el.dataset.bloque!;
      const sel = leerSeleccion(el);
      const cursor = sel ? { a: c.posicionRelativa(id, sel.a), h: c.posicionRelativa(id, sel.f) } : null;
      ultimaCaja.current = id;
      c.ponerPresencia({ bloque: id, cursor: cursor && cursor.a && cursor.h ? cursor : null, sig: siguiendo });
    } else {
      c.ponerPresencia({ bloque: seleccion[0] || ultimaCaja.current, cursor: null, sig: siguiendo });
    }
  };
  const publicarRef = useRef(publicarPresencia);
  publicarRef.current = publicarPresencia;
  useEffect(() => {
    let t: any = null;
    const programar = () => { if (!t) t = setTimeout(() => { t = null; publicarRef.current(); }, 80); };
    const abajo = (e: PointerEvent) => {
      const caja = (e.target as HTMLElement | null)?.closest?.('[data-bloque-caja]') as HTMLElement | null;
      if (caja && docRef.current?.contains(caja)) { ultimaCaja.current = caja.dataset.bloqueCaja || null; programar(); }
    };
    document.addEventListener('selectionchange', programar);
    document.addEventListener('pointerdown', abajo, true);
    return () => { document.removeEventListener('selectionchange', programar); document.removeEventListener('pointerdown', abajo, true); clearTimeout(t); };
  }, []);
  useEffect(() => { publicarRef.current(); }, [seleccion, siguiendo, infoColab?.sincronizado]);

  // SIGUIENDO A ALGUIEN (como en Notion): la página se desplaza a donde esté.
  // Se deja de seguir al desplazarse o teclear uno mismo.
  const bloqueSeguido = personasColab.find(p => p.id === siguiendo && !p.yo)?.bloque || null;
  useEffect(() => {
    if (!siguiendo || !bloqueSeguido) return;
    document.getElementById(`b-${bloqueSeguido}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [siguiendo, bloqueSeguido]);
  useEffect(() => {
    if (!siguiendo) return;
    const parar = (e: Event) => { if ((e as KeyboardEvent).key === 'Shift') return; setSiguiendo(null); };
    const t = setTimeout(() => { window.addEventListener('wheel', parar, { passive: true }); window.addEventListener('keydown', parar); window.addEventListener('touchmove', parar, { passive: true }); }, 1200);
    return () => { clearTimeout(t); window.removeEventListener('wheel', parar); window.removeEventListener('keydown', parar); window.removeEventListener('touchmove', parar); };
  }, [siguiendo]);
  // Lo que Yjs le dice al editor (se renueva en cada render; ver `useColab`).
  colabCb.current = {
    leerEditor: (): Plano | null => (cargandoRef.current ? null : { titulo: metaRef.current.titulo, bloques: serializar() }),
    alInfo: (i: InfoColab) => {
      setPasosColab(i.pasos);
      if (i.estado === 'vivo' && i.sincronizado) { setGuardado(g => (g === 'sin conexión' || g === 'pendiente' ? 'sí' : g)); void borrarBorrador(docId.current!); }
      else if (i.estado === 'reconectando') setGuardado('sin conexión');
      if (i.version != null && (versionBase.current ?? 0) < i.version) versionBase.current = i.version;
    },
    alAviso: (t: string) => avisar(t),
    alPresencia: (p: PresenciaPersona[]) => setPersonasColab(p),
    alRemoto: (plano: Plano, c, origen) => aplicarRemoto(plano, c, origen),
  };
  const cargandoRef = useRef(cargando);
  cargandoRef.current = cargando;

  /** Llega a la pantalla lo que otra persona (o un deshacer) cambió. El bloque
   *  que se está escribiendo tiene su texto en el DOM: se parchea a mano para
   *  no mover el cursor; todo lo demás lo pinta React desde el estado. */
  const aplicarRemoto = (plano: Plano, c: import('../utils/colabModelo').CambiosRemotos, origen: 'remoto' | 'deshacer' | 'primera') => {
    // Con una composición a medias (acentos, IME) se espera a que acabe.
    if (estaComponiendo()) { setTimeout(() => aplicarRemoto(plano, c, origen), 80); return; }
    const nuevos = normalizarNiveles(plano.bloques);
    const ids = new Set(nuevos.map(b => b.id));
    for (const k of Object.keys(textosRef.current)) if (!ids.has(k)) delete textosRef.current[k];
    for (const k of Object.keys(filasRef.current)) if (!ids.has(k)) delete filasRef.current[k];
    const activo = bloqueActivoRef.current;
    const el = activo ? document.querySelector(`[data-bloque="${activo}"]`) as HTMLElement | null : null;
    const tablasNuevas: Record<string, number> = {};
    for (const b of nuevos) {
      if (b.texto !== undefined) textosRef.current[b.id] = b.texto;
      if (b.filas) {
        const antes = filasRef.current[b.id];
        if (antes && JSON.stringify(antes) !== JSON.stringify(b.filas)) {
          // Celdas con el cursor dentro no se tocan; el resto, al momento.
          const t = document.querySelector(`[data-celda-de="${b.id}"]`)?.closest('table') as HTMLTableElement | null;
          const mismasDim = antes.length === b.filas.length && antes.every((f, i) => f.length === b.filas![i].length);
          if (t && mismasDim) {
            b.filas.forEach((f, fi) => f.forEach((txt, ci) => {
              const td = t.rows[fi]?.cells[ci];
              if (td && td !== document.activeElement && td.textContent !== txt) td.textContent = txt;
            }));
          } else tablasNuevas[b.id] = (revTablas[b.id] || 0) + 1;
        }
        filasRef.current[b.id] = b.filas;
      }
    }
    if (el && activo && ids.has(activo)) {
      const b = nuevos.find(x => x.id === activo)!;
      const delta = c.textos.get(activo)?.delta;
      parchearBloque(el, textosRef.current[activo] ?? '', b.tipo !== 'codigo' && b.tipo !== 'ecuacion', origen === 'deshacer' && delta ? posTrasDelta(delta) : null);
    }
    bloquesRef.current = nuevos;
    bloquesBase.current = nuevos.map(x => ({ ...x }));
    sinRegistrar.current = true;
    setBloques(nuevos.length ? nuevos : [{ id: nuevoIdBloque(), tipo: 'parrafo', texto: '' }]);
    if (Object.keys(tablasNuevas).length) setRevTablas(r => ({ ...r, ...tablasNuevas }));
    if (plano.titulo !== metaRef.current.titulo) { metaRef.current = { ...metaRef.current, titulo: plano.titulo }; setTitulo(plano.titulo); }
  };
  // Cada cambio de estructura o de campos sube a Yjs al renderizarse.
  useEffect(() => {
    if (colabVivo() && !cargando) colabRef.current!.empujar({ titulo: metaRef.current.titulo, bloques: serializar() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloques]);
  useEffect(() => () => {
    clearTimeout(timerGuardado.current);
    if (hayPendiente.current) guardarAhoraRef.current();
  }, []);

  // --------------------------------------------------------------------------
  // Operaciones de bloques
  // --------------------------------------------------------------------------
  /** Aplica lo elegido en la barra «/». El bloque estaba vacío salvo por lo
   *  que has tecleado tras la barra, así que se CONVIERTE en vez de crear uno
   *  nuevo — que es lo que hace Notion y lo que espera cualquiera. */
  const elegirDeLaBarra = (b: Bloque, tipo: TipoMenu) => {
    setBarra(null);
    const el = document.querySelector(`[data-bloque="${b.id}"]`) as HTMLElement | null;
    if (el) el.textContent = '';
    textosRef.current[b.id] = '';
    if (tipo === 'publicacion' || tipo === 'producto' || tipo === 'video' || tipo === 'mapa') { insertar(b.id, tipo); return; }
    if (tipo === 'separador' || tipo === 'imagen' || tipo === 'tabla' || tipo === 'basedatos' || tipo === 'subpagina' || tipo === 'medio' || tipo === 'pizarra' || tipo === 'marcador' || tipo === 'web' || tipo === 'embed' || tipo === 'migas' || tipo === 'boton' || tipo === 'sincronizado') { insertar(b.id, tipo); return; }
    const plegable = tipo.startsWith('plegable');
    const real: TipoBloque = plegable ? `titulo${tipo.slice(-1)}` as TipoBloque : tipo as TipoBloque;
    setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo: real, texto: '', plegable: plegable || undefined } : x));
    setFocoId(b.id);
    programarGuardado();
  };

  const insertar = (tras: string | null, tipoMenu: TipoMenu) => {
    // Un vídeo es un bloque de web que espera su enlace: si es de YouTube o
    // Vimeo pasa a reproductor (ver `alPonerEnlace`), y si no, sale a subirlo.
    const esVideo = tipoMenu === 'video';
    if (tipoMenu === 'mapa') {
      setMenuAbierto(null);
      setBuscaProducto(false);
      setSoloMapas(true);
      setBuscadorPub(tras ?? '');
      setBusquedaPub('');
      setResultadosPub([]);
      return;
    }
    const plegable = tipoMenu.startsWith('plegable');
    const tipo: TipoBloque = esVideo ? 'web' : plegable ? `titulo${tipoMenu.slice(-1)}` as TipoBloque : tipoMenu as TipoBloque;
    if (tipo === 'subpagina') { crearSubpagina(tras); return; }
    if (tipo === 'sincronizado') { setMenuAbierto(null); crearSincronizado(tras); return; }
    if (tipo === 'pizarra') { crearPizarra(tras); return; }
    if (tipo === 'medio') {
      setMenuAbierto(null);
      archivoTras.current = tras;
      archivoRef.current?.click();
      return;
    }
    // El bloque de publicación no se inserta vacío: primero se elige QUÉ
    // publicación embeber, en el buscador.
    if (tipo === 'publicacion' || tipo === 'producto') {
      setMenuAbierto(null);
      setSoloMapas(false);
      setBuscaProducto(tipo === 'producto');
      setBuscadorPub(tras ?? '');
      setBusquedaPub('');
      setResultadosPub([]);
      return;
    }
    const nuevo: Bloque = { id: nuevoIdBloque(), tipo };
    if (plegable) nuevo.plegable = true;
    if (tipo === 'boton') { nuevo.texto = 'Botón'; nuevo.boton = { tipo: 'plantilla' }; setConfigBoton(nuevo.id); }
    if (esVideo) videosPendientes.current.add(nuevo.id);
    if (tipo === 'tabla') filasRef.current[nuevo.id] = [['', ''], ['', '']];
    if (tipo !== 'separador' && tipo !== 'imagen' && tipo !== 'tabla' && tipo !== 'marcador' && tipo !== 'web' && tipo !== 'embed' && tipo !== 'migas') textosRef.current[nuevo.id] = nuevo.texto ?? '';
    setBloques(bs => {
      // Sin `tras`, arriba del todo (era así: `-1 + 1`).
      const { pos, nivel } = tras ? puntoInsercion(bs, tras) : { pos: 0, nivel: 0 };
      const copia = [...bs];
      copia.splice(pos, 0, { ...nuevo, nivel: nivel || undefined });
      return copia;
    });
    setMenuAbierto(null);
    setBloqueActivo(nuevo.id);
    setFocoId(nuevo.id);
    programarGuardado();
  };

  const eliminar = (bid: string) => {
    setBloques(bs => {
      const i = bs.findIndex(b => b.id === bid);
      const copia = bs.filter(b => b.id !== bid);
      const anterior = copia[Math.max(0, i - 1)];
      if (anterior) { setFocoId(anterior.id); setBloqueActivo(anterior.id); }
      // Sus hijos, si tenía, se quedan: pasan a ser del bloque de encima.
      return copia.length ? normalizarNiveles(copia) : [{ id: nuevoIdBloque(), tipo: 'parrafo' }];
    });
    delete textosRef.current[bid];
    delete filasRef.current[bid];
    programarGuardado();
  };

  // ══ LO QUE SE HACE CON UN BLOQUE (2026-09-30) ═════════════════════════

  /** Lo que se añade «detrás» de un bloque en columnas va detrás de TODA la
   *  fila: metido en medio partiría las columnas en dos. Cada columna lleva
   *  un bloque; para apilar varios dentro, se arrastran a un lado. */
  const finDeFila = (bs: Bloque[], i: number) => {
    const g = bs[i]?.grupo;
    let j = i;
    while (g && bs[j + 1]?.grupo === g) j++;
    return j;
  };

  /** Un grupo de columnas con un solo bloque ya no es un grupo. */
  const normalizarGrupos = (bs: Bloque[]): Bloque[] => {
    // Un grupo partido en dos tramos son dos filas: el segundo tramo recibe
    // otro nombre, para que mover uno no arrastre al otro.
    const vistos = new Set<string>();
    const renombre: Record<string, string> = {};
    const tramos = bs.map((x, i) => {
      if (!x.grupo) return x;
      const seguido = i > 0 && bs[i - 1].grupo === x.grupo;
      if (!seguido) {
        if (vistos.has(x.grupo)) renombre[x.grupo] = `G${nuevoIdBloque()}`;
        else { vistos.add(x.grupo); delete renombre[x.grupo]; }
      }
      return renombre[x.grupo] ? { ...x, grupo: renombre[x.grupo] } : x;
    });
    const cuenta: Record<string, number> = {};
    for (const x of tramos) if (x.grupo) cuenta[x.grupo] = (cuenta[x.grupo] || 0) + 1;
    return normalizarNiveles(tramos.map(x => (x.grupo && cuenta[x.grupo] < 2 ? { ...x, grupo: undefined } : x)));
  };

  // ══ BLOQUES DENTRO DE BLOQUES, EN LA LISTA PLANA (2026-10-05) ═══════════
  // Ver `bloques` en `utils/bloques.ts`. Los hijos de `bs[i]` son los que van
  // justo detrás con más `nivel`; `finSubarbol` dice dónde acaban.

  /** ¿Lo nuevo que se ponga «detrás» de este bloque va DENTRO de él? Sí si
   *  está abierto y tiene hijos a la vista, o si es un desplegable abierto
   *  (aunque esté vacío): es lo que se ve justo debajo, como en Notion. */
  const vaDentro = (bs: Bloque[], i: number) => {
    const b = bs[i];
    if (!b || b.grupo || plegadosRef.current.has(b.id)) return false;
    return esContenedor(b) || ((bs[i + 1]?.nivel || 0) > (b.nivel || 0));
  };

  /** Dónde va (posición y sangría) un bloque nuevo puesto «detrás» de `tras`. */
  const puntoInsercion = (bs: Bloque[], tras: string | null) => {
    // «Añadir un bloque» del pie: al final de la página y sin sangría, por
    // mucho que el último bloque esté dentro de un desplegable.
    if (alFinal.current) return { pos: bs.length, nivel: 0 };
    const i = tras ? bs.findIndex(b => b.id === tras) : -1;
    if (i < 0) return { pos: bs.length, nivel: 0 };
    if (vaDentro(bs, i)) return { pos: i + 1, nivel: (bs[i].nivel || 0) + 1 };
    return { pos: finSubarbol(bs, finDeFila(bs, i)) + 1, nivel: bs[i].nivel || 0 };
  };

  const alFinal = useRef(false);
  useEffect(() => { if (!menuAbierto) alFinal.current = false; }, [menuAbierto]);

  /** Tab (+1) y ⇧Tab (−1): el bloque se mueve con todos sus hijos. Como en
   *  Notion, al quitar sangría los hermanos que tenía debajo pasan a ser
   *  hijos suyos (en la lista plana sale solo: siguen con más sangría). */
  const sangrar = (ids: string[], delta: 1 | -1) => {
    setBloques(bs => {
      let lista = [...bs];
      // Si una madre y su hija van marcadas, la hija ya viaja con su madre.
      const marcados = new Set(ids);
      const orden = lista.map((x, i) => ({ x, i })).filter(({ x }) => marcados.has(x.id));
      const hechos = new Set<string>();
      for (const { x } of orden) {
        const i = lista.findIndex(y => y.id === x.id);
        const n = lista[i].nivel || 0;
        // ¿Lo ha movido ya su madre?
        let madreMarcada = false;
        for (let j = i - 1, m = n; j >= 0 && m > 0; j--) {
          if ((lista[j].nivel || 0) < m) { if (hechos.has(lista[j].id)) { madreMarcada = true; break; } m = lista[j].nivel || 0; }
        }
        if (madreMarcada) continue;
        // En columnas no se sangra: una columna lleva un bloque.
        if (lista[i].grupo) continue;
        if (delta === 1 && (i === 0 || (lista[i - 1].nivel || 0) < n)) continue;   // no tiene hermano encima
        if (delta === -1 && n === 0) continue;
        const fin = finSubarbol(lista, i);
        lista = lista.map((y, k) => (k >= i && k <= fin ? { ...y, nivel: ((y.nivel || 0) + delta) || undefined } : y));
        hechos.add(x.id);
        // Sangrar dentro de un desplegable cerrado lo esconde: se abre.
        if (delta === 1) {
          for (let j = i - 1; j >= 0; j--) if ((lista[j].nivel || 0) === n) { if (plegadosRef.current.has(lista[j].id)) plegar(lista[j].id); break; }
        }
      }
      return hechos.size ? normalizarNiveles(lista) : bs;
    });
    programarGuardado();
  };

  // Del estado y no de `bloquesRef`: se usa al pintar, y el ref se pone al
  // día DESPUÉS del primer pintado.
  const tieneHijos = (b: Bloque) => {
    const i = bloques.findIndex(x => x.id === b.id);
    return i >= 0 && (bloques[i + 1]?.nivel || 0) > (b.nivel || 0);
  };

  /** Un párrafo nuevo, el primero dentro de `bid`, con el cursor en él. */
  const meterDentro = (bid: string) => {
    const nuevo: Bloque = { id: nuevoIdBloque(), tipo: 'parrafo', texto: '' };
    textosRef.current[nuevo.id] = '';
    setPlegados(p => { if (!p.has(bid)) return p; const s = new Set(p); s.delete(bid); return s; });
    setBloques(bs => {
      const i = bs.findIndex(x => x.id === bid);
      if (i < 0) return bs;
      const copia = [...bs];
      copia.splice(i + 1, 0, { ...nuevo, nivel: (bs[i].nivel || 0) + 1 });
      return copia;
    });
    setBloqueActivo(nuevo.id);
    setFocoId(nuevo.id);
    programarGuardado();
  };

  /** Una copia de los hijos de `bs[i]` con ids nuevos (la plantilla de un
   *  botón), con la sangría contada desde 0. */
  const copiaHijos = (bs: Bloque[], i: number): Bloque[] => {
    const n = (bs[i].nivel || 0) + 1;
    return bs.slice(i + 1, finSubarbol(bs, i) + 1).map(o => {
      const nid = nuevoIdBloque();
      const texto = o.texto !== undefined || textosRef.current[o.id] !== undefined ? (textosRef.current[o.id] ?? o.texto ?? '') : undefined;
      const filas = filasRef.current[o.id] ? filasRef.current[o.id].map(f => [...f]) : o.filas;
      return { ...o, id: nid, texto, filas, nivel: ((o.nivel || 0) - n) || undefined };
    });
  };

  /**
   * PULSAR UN BOTÓN (2026-10-05, como los de Notion). En el editor hace lo
   * suyo de verdad: es así como se prueba, y como se usa una página de
   * trabajo (un diario, una lista de reuniones…).
   */
  const ejecutarBoton = async (b: Bloque) => {
    const a: AccionBoton = b.boton || { tipo: 'plantilla' };
    const bs = bloquesRef.current;
    const i = bs.findIndex(x => x.id === b.id);
    if (i < 0) return;
    if (a.tipo === 'enlace') {
      if (!a.url) { setConfigBoton(b.id); return; }
      if (/^https?:/i.test(a.url)) window.open(a.url, '_blank', 'noopener'); else navigate(a.url);
      return;
    }
    if (a.tipo === 'plantilla') {
      const copia = copiaHijos(bs, i);
      if (!copia.length) { avisar('La plantilla del botón está vacía: escribe dentro de él lo que quieras insertar.'); meterDentro(b.id); return; }
      for (const c of copia) { if (c.texto !== undefined) textosRef.current[c.id] = c.texto; if (c.filas) filasRef.current[c.id] = c.filas; }
      guardarHistoria();
      setBloques(lista => {
        const k = lista.findIndex(x => x.id === b.id);
        if (k < 0) return lista;
        const pos = finSubarbol(lista, k) + 1;
        const n = lista[k].nivel || 0;
        const out = [...lista];
        out.splice(pos, 0, ...copia.map(c => ({ ...c, nivel: ((c.nivel || 0) + n) || undefined })));
        return out;
      });
      programarGuardado();
      avisar(copia.length === 1 ? 'Bloque insertado' : `${copia.length} bloques insertados`);
      return;
    }
    setBotonOcupado(b.id);
    try {
      if (a.tipo === 'pagina') {
        const tituloNuevo = conFecha(a.titulo || '') || 'Sin título';
        const r = await fetch('/api/documentos', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: tituloNuevo }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.id) throw new Error(j.error || 'No se pudo crear la página.');
        // La plantilla del botón es el contenido de la página nueva.
        const contenido = copiaHijos(bs, i);
        if (contenido.length) {
          await fetch(`/api/windows/${j.id}`, {
            method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: tituloNuevo, config: { bloques: aArbol(contenido) } }),
          });
        }
        const nuevo: Bloque = { id: nuevoIdBloque(), tipo: 'subpagina', entityId: j.id, pubTitulo: tituloNuevo };
        guardarHistoria();
        setBloques(lista => {
          const k = lista.findIndex(x => x.id === b.id);
          const out = [...lista];
          out.splice(k < 0 ? out.length : finSubarbol(lista, k) + 1, 0, { ...nuevo, nivel: (lista[k]?.nivel || 0) || undefined });
          return out;
        });
        programarGuardado();
        window.dispatchEvent(new CustomEvent('humanity:menu-cambiado'));
        avisar(`Página «${tituloNuevo}» creada`);
      } else if (a.tipo === 'fila') {
        if (!a.tabla_id) { setConfigBoton(b.id); return; }
        const r = await fetch(`/api/bd/tablas/${a.tabla_id}/filas`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: conFecha(a.titulo || '') || undefined }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'No se pudo añadir la fila.');
        // La base de datos de la página se vuelve a leer para enseñarla.
        setVersionDatos(v => v + 1);
        avisar('Fila añadida a la base de datos');
      }
    } catch (e: any) { fallar(e.message); }
    finally { setBotonOcupado(null); }
  };

  /** ¿Convertir este título en plegable (o al revés)? Al plegarlo se lleva
   *  dentro lo que tiene debajo hasta el siguiente título de su tamaño o
   *  mayor —«pliega lo que hay debajo»—; al desplegarlo, lo suelta. */
  const alternarPlegable = (bid: string) => {
    setMenuAsa(null);
    guardarHistoria();
    setBloques(bs => {
      const i = bs.findIndex(x => x.id === bid);
      if (i < 0) return bs;
      const t = bs[i];
      const n = t.nivel || 0;
      const nivelTitulo = Number(t.tipo.slice(-1));
      const out = [...bs];
      if (t.plegable) {
        const fin = finSubarbol(bs, i);
        for (let k = i + 1; k <= fin; k++) out[k] = { ...out[k], nivel: ((out[k].nivel || 0) - 1) || undefined };
        out[i] = { ...t, plegable: undefined };
        return normalizarNiveles(out);
      }
      // Lo que ya llevara dentro, más lo que tiene debajo a su altura.
      let fin = finSubarbol(bs, i);
      while (fin + 1 < bs.length) {
        const x = bs[fin + 1];
        if ((x.nivel || 0) < n) break;
        if ((x.nivel || 0) === n && /^titulo[123]$/.test(x.tipo) && Number(x.tipo.slice(-1)) <= nivelTitulo) break;
        fin = finSubarbol(bs, fin + 1);
      }
      const inicio = finSubarbol(bs, i) + 1;
      for (let k = inicio; k <= fin; k++) out[k] = { ...out[k], nivel: (out[k].nivel || 0) + 1, grupo: (out[k].nivel || 0) === n ? undefined : out[k].grupo };
      out[i] = { ...t, plegable: true };
      return normalizarGrupos(out);
    });
    programarGuardado();
  };

  // ══ BLOQUES SINCRONIZADOS (2026-10-06, #22) ═════════════════════════════
  // Un bloque `sincronizado` lleva dentro (sus hijos) una copia del contenido
  // que vive en `bloques_sincronizados`. Al guardar la página, si esa copia
  // ha cambiado respecto a lo último que se supo del servidor (`sincBase`),
  // se guarda también allí, y el servidor pone al día las demás páginas. Al
  // abrir la página se pide lo último; y las otras pestañas se enteran al
  // momento por `avisoPaginas` (BroadcastChannel).
  const sincBase = useRef<Record<string, { firma: string; version: number }>>({});
  const [sincPaginas, setSincPaginas] = useState<Record<string, { id: string; titulo: string }[]>>({});

  /** JSON con las claves en orden: dos copias iguales dan la misma firma. */
  const firma = (x: unknown): string => JSON.stringify(x, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, y]) => y !== undefined).sort(([a], [b]) => a.localeCompare(b))) : v);

  /** El contenido (árbol) del sincronizado `bs[i]`, con el texto vivo. */
  const contenidoSinc = (bs: Bloque[], i: number): Bloque[] => {
    const n = (bs[i].nivel || 0) + 1;
    return aArbol(bs.slice(i + 1, finSubarbol(bs, i) + 1).map(x => ({
      ...x,
      texto: x.texto !== undefined || textosRef.current[x.id] !== undefined ? (textosRef.current[x.id] ?? x.texto ?? '') : undefined,
      filas: x.tipo === 'tabla' ? (filasRef.current[x.id] ?? x.filas) : undefined,
      nivel: ((x.nivel || 0) - n) || undefined,
    })));
  };

  /** Cambia lo de dentro de cada sincronizado `sincId` por `arbol` (sin que
   *  cuente para deshacer: no lo ha hecho quien escribe aquí). */
  const ponerContenidoSinc = (sincId: string, arbol: Bloque[]) => {
    sinRegistrar.current = true;
    setRevision(r => r + 1);
    setBloques(bs => {
      let lista = bs;
      for (let i = 0; i < lista.length; i++) {
        const b = lista[i];
        if (b.tipo !== 'sincronizado' || b.sincId !== sincId) continue;
        const fin = finSubarbol(lista, i);
        const n = (b.nivel || 0) + 1;
        const nuevos = aplanar(arbol).map(x => ({ ...x, nivel: ((x.nivel || 0) + n) || undefined }));
        for (const x of nuevos) { if (x.texto !== undefined) textosRef.current[x.id] = x.texto; if (x.filas) filasRef.current[x.id] = x.filas; }
        lista = [...lista.slice(0, i + 1), ...nuevos, ...lista.slice(fin + 1)];
        i += nuevos.length;
      }
      return lista;
    });
  };

  const refrescarSincRef = useRef<(bs: Bloque[]) => void>(() => {});
  refrescarSincRef.current = (bs: Bloque[]) => {
    const ids = [...new Set(bs.filter(b => b.tipo === 'sincronizado' && b.sincId).map(b => b.sincId!))];
    for (const sid of ids) {
      fetch(`/api/sincronizados/${sid}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => {
        if (!j) return;
        setSincPaginas(p => ({ ...p, [sid]: j.paginas || [] }));
        const contenido = aArbol(aplanar(j.bloques || []));
        sincBase.current[sid] = { firma: firma(contenido), version: j.version };
        const i = bloquesRef.current.findIndex(b => b.sincId === sid);
        if (i >= 0 && firma(contenidoSinc(bloquesRef.current, i)) !== firma(contenido)) ponerContenidoSinc(sid, contenido);
      }).catch(() => {});
    }
  };

  const guardarSincRef = useRef<(bs: Bloque[]) => Promise<void>>(async () => {});
  guardarSincRef.current = async (bs: Bloque[]) => {
    const hechos = new Set<string>();
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (b.tipo !== 'sincronizado' || !b.sincId || hechos.has(b.sincId)) continue;
      hechos.add(b.sincId);
      const base = sincBase.current[b.sincId];
      // Sin saber aún qué hay en el servidor no se escribe: la copia de esta
      // página podría ser vieja y pisaría lo que se hizo en otra.
      if (!base) continue;
      const contenido = contenidoSinc(bs, i);
      const f = firma(contenido);
      if (f === base.firma) continue;
      const enviar = (version: number) => fetch(`/api/sincronizados/${b.sincId}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloques: contenido, version_base: version, pagina: docId.current }),
      }).catch(() => null);
      let r = await enviar(base.version);
      if (r?.status === 409) {
        // Otra página lo cambió entretanto. Gana lo que se acaba de escribir
        // aquí (es lo que se ve en pantalla), y se dice.
        const j = await r.json().catch(() => ({}));
        r = await enviar(j.version);
        avisar('Este bloque sincronizado también se había cambiado en otra página: se ha guardado tu versión.');
      }
      if (!r?.ok) continue;
      const j = await r.json().catch(() => ({}));
      sincBase.current[b.sincId] = { firma: f, version: j.version };
      avisarMovimiento('humanity:sincronizado-cambiado', { sincId: b.sincId, bloques: contenido, version: j.version, desde: docId.current });
    }
  };

  // Lo que se edita en otra pestaña llega aquí al momento.
  useEffect(() => {
    const oir = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!d.sincId || d.desde === docId.current) return;
      if (!bloquesRef.current.some(b => b.sincId === d.sincId)) return;
      const contenido = aArbol(aplanar(d.bloques || []));
      sincBase.current[d.sincId] = { firma: firma(contenido), version: d.version };
      ponerContenidoSinc(d.sincId, contenido);
    };
    window.addEventListener('humanity:sincronizado-cambiado', oir);
    return () => window.removeEventListener('humanity:sincronizado-cambiado', oir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Inserta un sincronizado que ya existe (pegado de otra página). */
  const insertarSincronizado = async (tras: string | null, sid: string, sustituir?: string) => {
    const r = await fetch(`/api/sincronizados/${sid}`, { credentials: 'include' }).catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    if (!j) { fallar('No se ha encontrado ese bloque sincronizado (o no tienes acceso a él).'); return; }
    const contenido = aArbol(aplanar(j.bloques || []));
    sincBase.current[sid] = { firma: firma(contenido), version: j.version };
    setSincPaginas(p => ({ ...p, [sid]: j.paginas || [] }));
    const madre: Bloque = { id: nuevoIdBloque(), tipo: 'sincronizado', sincId: sid };
    guardarHistoria();
    setBloques(bs => {
      const k = sustituir ? bs.findIndex(x => x.id === sustituir) : -1;
      const { pos, nivel } = k >= 0 ? { pos: k, nivel: bs[k].nivel || 0 } : puntoInsercion(bs, tras);
      const hijos = aplanar(contenido).map(x => ({ ...x, nivel: (x.nivel || 0) + nivel + 1 }));
      for (const x of hijos) { if (x.texto !== undefined) textosRef.current[x.id] = x.texto; if (x.filas) filasRef.current[x.id] = x.filas; }
      const out = [...bs];
      out.splice(pos, k >= 0 ? 1 : 0, { ...madre, nivel: nivel || undefined }, ...hijos);
      return out;
    });
    programarGuardado();
    avisar('Bloque sincronizado pegado: lo que cambies aquí cambiará en todas sus páginas.');
  };

  /** Uno nuevo, vacío salvo un párrafo para escribir. */
  const crearSincronizado = async (tras: string | null, envolver?: string) => {
    if (!docId.current) return;
    // Al convertir un bloque, su contenido (con sus hijos) es lo de dentro.
    const bs0 = bloquesRef.current;
    const k = envolver ? bs0.findIndex(x => x.id === envolver) : -1;
    const contenido = k >= 0 ? contenidoSinc([{ ...bs0[k], id: '_', nivel: (bs0[k].nivel || 0) - 1 }, ...bs0.slice(k, finSubarbol(bs0, k) + 1)], 0) : [];
    const r = await fetch('/api/sincronizados', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagina: docId.current, bloques: contenido }),
    }).catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    if (!j?.id) { fallar('No se ha podido crear el bloque sincronizado.'); return; }
    sincBase.current[j.id] = { firma: firma(aArbol(aplanar(contenido))), version: j.version };
    setSincPaginas(p => ({ ...p, [j.id]: [{ id: docId.current!, titulo }] }));
    const madre: Bloque = { id: nuevoIdBloque(), tipo: 'sincronizado', sincId: j.id };
    guardarHistoria();
    if (k >= 0) {
      setBloques(bs => {
        const i = bs.findIndex(x => x.id === envolver);
        if (i < 0) return bs;
        const fin = finSubarbol(bs, i);
        const out = [...bs];
        for (let m = i; m <= fin; m++) out[m] = { ...out[m], nivel: (out[m].nivel || 0) + 1, grupo: undefined };
        out.splice(i, 0, { ...madre, nivel: bs[i].nivel || undefined });
        return out;
      });
    } else {
      const hijo: Bloque = { id: nuevoIdBloque(), tipo: 'parrafo', texto: '' };
      textosRef.current[hijo.id] = '';
      setBloques(bs => {
        const { pos, nivel } = puntoInsercion(bs, tras);
        const out = [...bs];
        out.splice(pos, 0, { ...madre, nivel: nivel || undefined }, { ...hijo, nivel: nivel + 1 });
        return out;
      });
      setBloqueActivo(hijo.id);
      setFocoId(hijo.id);
    }
    programarGuardado();
  };

  /** Copia el bloque para pegarlo en otra página (⌘V allí). */
  const copiarSincronizado = (b: Bloque) => {
    setMenuAsa(null);
    const marca = `humanity-sincronizado:${b.sincId}`;
    navigator.clipboard?.writeText(marca).then(
      () => avisar('Copiado. Pégalo (⌘V) en otra página: quedará sincronizado con éste.'),
      () => avisar(marca));
  };

  /** Deja de sincronizar ESTA copia: lo de dentro pasa a ser bloques
   *  normales de la página (con ids nuevos), y las demás páginas siguen. */
  const dejarDeSincronizar = (bid: string) => {
    setMenuAsa(null);
    guardarHistoria();
    setBloques(bs => {
      const i = bs.findIndex(x => x.id === bid);
      if (i < 0) return bs;
      const fin = finSubarbol(bs, i);
      const sueltos = bs.slice(i + 1, fin + 1).map(x => {
        const nid = nuevoIdBloque();
        if (textosRef.current[x.id] !== undefined) textosRef.current[nid] = textosRef.current[x.id];
        if (filasRef.current[x.id]) filasRef.current[nid] = filasRef.current[x.id];
        return { ...x, id: nid, nivel: ((x.nivel || 0) - 1) || undefined };
      });
      return normalizarNiveles([...bs.slice(0, i), ...sueltos, ...bs.slice(fin + 1)]);
    });
    programarGuardado();
    avisar('Ya no está sincronizado: ahora es contenido normal de esta página.');
  };

  /** Para cada bloque, el sincronizado que lo contiene (si lo hay) y cuántos
   *  sincronizados tiene por encima (no cuentan para la sangría: lo de dentro
   *  se ve a la altura del propio bloque, como en Notion). */
  const enSinc = useMemo(() => {
    const m: Record<string, { sinc: string; capas: number }> = {};
    const pila: { id: string; nivel: number }[] = [];
    for (const b of bloques) {
      const n = b.nivel || 0;
      while (pila.length && pila[pila.length - 1].nivel >= n) pila.pop();
      if (pila.length) m[b.id] = { sinc: pila[pila.length - 1].id, capas: pila.length };
      if (b.tipo === 'sincronizado') pila.push({ id: b.id, nivel: n });
    }
    return m;
  }, [bloques]);

  /** Los ids de un bloque y de todo lo que lleva dentro. */
  const idsSubarbol = (bs: Bloque[], bid: string) => {
    const i = bs.findIndex(x => x.id === bid);
    return i < 0 ? [] : bs.slice(i, finSubarbol(bs, i) + 1).map(x => x.id);
  };

  /** Lo que antes hacía la foto a mano: ahora la foto la hace sola el efecto
   *  de `bloques`. Aquí sólo se cierra el grupo de teclas, para que lo que
   *  viene después sea un paso aparte. */
  const guardarHistoria = () => { grupoTexto.current = null; };

  const avisar = (texto: string) => {
    setAviso(texto);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 6000);
  };

  /** Pone una foto en la página: estructura, textos y dónde estaba el cursor. */
  const restaurar = (foto: Foto) => {
    for (const x of foto.bloques) {
      if (x.texto !== undefined) textosRef.current[x.id] = x.texto;
      if (x.filas) filasRef.current[x.id] = x.filas.map(f => [...f]);
    }
    sinRegistrar.current = true;
    grupoTexto.current = null;
    setRevision(r => r + 1);
    setBloques(foto.bloques.map(x => ({ ...x })));
    setBarra(null);
    if (foto.foco && foto.bloques.some(x => x.id === foto.foco!.id)) {
      // Si el bloque quedó dentro de un desplegable cerrado, se abre: el
      // cursor tiene que verse donde está el cambio.
      abrirAncestros(foto.bloques, foto.foco.id);
      setBloqueActivo(foto.foco.id);
      posicionCaret.current = foto.foco.pos;
      setFocoId(foto.foco.id);
    }
    programarGuardado();
  };

  const deshacer = () => {
    // En vivo, cada persona deshace SOLO lo suyo (`Y.UndoManager`).
    if (colabRef.current && colabVivo()) { colabRef.current.deshacer(); return; }
    const foto = pilaDeshacer.current.pop();
    if (!foto) return;
    pilaRehacer.current.push(fotoAhora());
    restaurar(foto);
    setAviso(null);
    contarPasos();
  };

  const rehacer = () => {
    if (colabRef.current && colabVivo()) { colabRef.current.rehacer(); return; }
    const foto = pilaRehacer.current.pop();
    if (!foto) return;
    pilaDeshacer.current.push(fotoAhora());
    restaurar(foto);
    contarPasos();
  };

  const borrarBloque = (bid: string) => {
    guardarHistoria();
    setMenuAsa(null);
    // Con lo que lleva dentro, como en Notion: borrar un desplegable no deja
    // su contenido suelto por la página.
    const fuera = idsSubarbol(bloquesRef.current, bid);
    for (const x of fuera.slice(1)) { delete textosRef.current[x]; delete filasRef.current[x]; }
    if (fuera.length > 1) setBloques(bs => bs.filter(x => !fuera.slice(1).includes(x.id)));
    eliminar(bid);
    setBloques(bs => normalizarGrupos(bs));
    avisar(fuera.length > 1 ? `Bloque borrado (con ${fuera.length - 1} dentro)` : 'Bloque borrado');
  };

  const duplicar = (bid: string) => {
    guardarHistoria();
    setMenuAsa(null);
    const nuevoId = nuevoIdBloque();
    setBloques(bs => {
      const i = bs.findIndex(x => x.id === bid);
      if (i < 0) return bs;
      // El bloque y todo lo que lleva dentro, cada uno con su id nuevo.
      const trozo = bs.slice(i, finSubarbol(bs, i) + 1);
      const copias: Bloque[] = trozo.map((o, k) => {
        const nid = k === 0 ? nuevoId : nuevoIdBloque();
        const c: Bloque = {
          ...o, id: nid, grupo: undefined,
          texto: o.texto !== undefined || textosRef.current[o.id] !== undefined ? (textosRef.current[o.id] ?? o.texto ?? '') : undefined,
          filas: filasRef.current[o.id] ? filasRef.current[o.id].map(f => [...f]) : o.filas,
        };
        if (c.texto !== undefined) textosRef.current[nid] = c.texto;
        if (c.filas) filasRef.current[nid] = c.filas;
        return c;
      });
      // En columnas, la copia va debajo de toda la fila: una columna aquí no
      // apila bloques dentro.
      const j = finSubarbol(bs, finDeFila(bs, i));
      const lista = [...bs];
      lista.splice(j + 1, 0, ...copias);
      return lista;
    });
    setBloqueActivo(nuevoId);
    programarGuardado();
    avisar('Bloque duplicado');
  };

  const cambiarBloque = (bid: string, cambios: Partial<Bloque>) => {
    guardarHistoria();
    setMenuAsa(null);
    setBloques(bs => bs.map(x => (x.id === bid ? { ...x, ...cambios } : x)));
    programarGuardado();
  };

  const copiarEnlace = (bid: string) => {
    setMenuAsa(null);
    const url = `${location.origin}${location.pathname}#b-${bid}`;
    navigator.clipboard?.writeText(url).then(() => avisar('Enlace al bloque copiado'), () => avisar(url));
  };

  /** Mueve un bloque encima, debajo o a un lado de otro. */
  /** Mueve un bloque —CON TODO LO QUE LLEVA DENTRO— encima, debajo o a un
   *  lado de otro. */
  const mover = (bid: string, d: NonNullable<typeof destino>) => {
    if (bid === d.id) return;
    guardarHistoria();
    setBloques(bs => {
      const i0 = bs.findIndex(x => x.id === bid);
      if (i0 < 0) return bs;
      const fin0 = finSubarbol(bs, i0);
      const trozo = bs.slice(i0, fin0 + 1);
      // Dentro de sí mismo no se puede.
      if (trozo.some(x => x.id === d.id)) return bs;
      const movido = trozo[0];
      const n0 = movido.nivel || 0;
      const lateral = d.lado === 'izquierda' || d.lado === 'derecha';
      // A un lado, en columnas, va solo: una columna lleva un bloque. Sus
      // hijos se quedan donde estaban, un nivel más arriba.
      const hijosSueltos = lateral ? trozo.slice(1).map(x => ({ ...x, nivel: ((x.nivel || 0) - 1) || undefined })) : [];
      let lista = normalizarGrupos([...bs.slice(0, i0), ...hijosSueltos, ...bs.slice(fin0 + 1)]);
      const t = lista.findIndex(x => x.id === d.id);
      if (t < 0) return bs;
      const obj = lista[t];
      const nObj = obj.nivel || 0;
      if (lateral) {
        const g = obj.grupo || `G${nuevoIdBloque()}`;
        lista = lista.map(x => (x.id === obj.id ? { ...x, grupo: g } : x));
        lista.splice(d.lado === 'izquierda' ? t : t + 1, 0, { ...movido, grupo: g, nivel: nObj || undefined });
      } else {
        // Encima o debajo de un bloque en columnas es encima o debajo de TODA
        // la fila: meterlo en medio partiría las columnas en dos.
        let i = t, j = t;
        while (obj.grupo && lista[i - 1]?.grupo === obj.grupo) i--;
        while (obj.grupo && lista[j + 1]?.grupo === obj.grupo) j++;
        // Debajo de un desplegable abierto es DENTRO, el primero: es lo que
        // se ve justo debajo. Debajo de otro bloque, detrás de sus hijos.
        let pos: number, nivel: number;
        if (d.lado === 'arriba') { pos = i; nivel = nObj; }
        else if (vaDentro(lista, t)) { pos = t + 1; nivel = nObj + 1; }
        else { pos = finSubarbol(lista, j) + 1; nivel = nObj; }
        lista.splice(pos, 0, ...trozo.map((x, k) => ({
          ...x, grupo: k === 0 ? undefined : x.grupo, nivel: ((x.nivel || 0) - n0 + nivel) || undefined,
        })));
      }
      return normalizarGrupos(lista);
    });
    programarGuardado();
  };

  const sacarDeColumnas = (bid: string) => {
    guardarHistoria();
    setMenuAsa(null);
    setBloques(bs => {
      const i = bs.findIndex(x => x.id === bid);
      const o = bs[i];
      if (!o?.grupo) return bs;
      const lista = bs.filter(x => x.id !== bid);
      let j = lista.findIndex(x => x.grupo === o.grupo);
      while (lista[j + 1]?.grupo === o.grupo) j++;
      lista.splice(j + 1, 0, { ...o, grupo: undefined });
      return normalizarGrupos(lista);
    });
    programarGuardado();
  };

  /** El asa: un clic abre el menú; arrastrar mueve el bloque. */
  const empezarArrastre = (bid: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    let movido = false;
    /** La página del menú izquierdo que hay debajo, si la hay (2026-10-05). */
    let aPagina: string | null = null;
    /** Dónde caería el bloque si se soltara en (x, y). */
    const calcular = (x: number, y: number) => {
      const debajo = document.elementFromPoint(x, y) as HTMLElement | null;
      // SOBRE UNA PÁGINA DEL MENÚ: el bloque irá a esa página. El menú se
      // entera por un aviso, porque este arrastre es del puntero y no del
      // navegador, y él solo no lo vería.
      const enMenu = debajo?.closest<HTMLElement>('[data-arbol-destino]')?.dataset.arbolDestino || null;
      if (enMenu !== aPagina) { aPagina = enMenu; window.dispatchEvent(new CustomEvent('humanity:bloque-sobre', { detail: { pagina: enMenu } })); }
      if (enMenu) { destinoRef.current = null; setDestino(null); return; }
      const caja = debajo?.closest<HTMLElement>('[data-bloque-caja]');
      if (!caja) return;   // en el hueco entre dos bloques se queda el último destino
      const tid = caja.dataset.bloqueCaja!;
      if (tid === bid) { destinoRef.current = null; setDestino(null); return; }
      const r = caja.getBoundingClientRect();
      const franja = Math.min(80, r.width * 0.2);
      const obj = bloquesRef.current.find(x2 => x2.id === tid);
      const enFila = obj?.grupo ? bloquesRef.current.filter(x2 => x2.grupo === obj.grupo && x2.id !== bid).length : 1;
      const lateral = !esMovil && enFila < 4;
      const lado = lateral && x < r.left + franja ? 'izquierda'
        : lateral && x > r.right - franja ? 'derecha'
        : y < r.top + r.height / 2 ? 'arriba' : 'abajo';
      destinoRef.current = { id: tid, lado };
      setDestino(destinoRef.current);
    };
    const alMover = (ev: PointerEvent) => {
      if (!movido && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      if (!movido) { movido = true; setMenuAsa(null); document.body.style.userSelect = 'none'; }
      setArrastre({ id: bid, x: ev.clientX, y: ev.clientY });
      calcular(ev.clientX, ev.clientY);
    };
    const alSoltar = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', alMover);
      // Se decide donde se SUELTA, no donde fue el último movimiento.
      if (movido && (ev.clientX || ev.clientY)) calcular(ev.clientX, ev.clientY);
      window.removeEventListener('pointerup', alSoltar);
      document.body.style.userSelect = '';
      if (aPagina) window.dispatchEvent(new CustomEvent('humanity:bloque-sobre', { detail: { pagina: null } }));
      if (!movido) setMenuAsa(m => (m === bid ? null : bid));
      else if (aPagina) llevarAPagina(bid, aPagina);
      else if (destinoRef.current) mover(bid, destinoRef.current);
      destinoRef.current = null;
      setDestino(null);
      setArrastre(null);
    };
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSoltar);
  };

  /**
   * UN BLOQUE A OTRA PÁGINA, SOLTÁNDOLO EN EL MENÚ (2026-10-05). Eugenio:
   * «arrastrar una imagen, una base de datos… y que se meta en la página donde
   * la sueltas». Lo pendiente se guarda antes, para que el servidor tenga el
   * bloque tal como está en pantalla; luego el servidor lo saca de aquí y lo
   * pone al final de la otra, y aquí se quita sin volver a guardar. Una
   * subpágina no es un bloque cualquiera: es mover esa página (`/mover`, que
   * no deja hacer círculos).
   */
  const llevarAPagina = async (bid: string, pid: string) => {
    if (!docId.current || pid === docId.current) return;
    const b = bloquesRef.current.find(x => x.id === bid);
    if (!b) return;
    clearTimeout(timerGuardado.current);
    await guardarAhora();
    const subpagina = b.tipo === 'subpagina' && b.entityId;
    const r = await fetch(subpagina ? `/api/paginas/${b.entityId}/mover` : `/api/paginas/${pid}/traer`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subpagina ? { dentro_de: pid } : { desde: docId.current, bloque_id: bid }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { fallar(j.error || 'No se ha podido llevar a esa página.'); return; }
    // Con lo que llevaba dentro: el servidor se lo ha llevado entero.
    const fuera = idsSubarbol(bloquesRef.current, bid);
    setBloques(bs => normalizarNiveles(bs.filter(x => !fuera.includes(x.id))));
    // Con el bloque, para que la página de destino, si está abierta en otra
    // pestaña, lo ponga en su pantalla y no lo borre al guardar.
    const destinoNombre = document.querySelector(`[data-arbol-destino="${pid}"]`)?.textContent?.replace('Meter dentro', '').trim() || 'la otra página';
    if (subpagina) avisarMovimiento('humanity:pagina-movida', { id: b.entityId, titulo: b.pubTitulo, dentro_de: pid });
    avisarMovimiento('humanity:bloque-movido', { desde: docId.current, a: pid, bloque: subpagina ? undefined : j.bloque, desdeEditor: true, destinoNombre });
    window.dispatchEvent(new CustomEvent('humanity:menu-cambiado'));
  };

  /** Subir archivos desde el «+»: el mismo camino que pegarlos o soltarlos. */
  const subirDesdeMenu = async (files: FileList | null) => {
    if (!files?.length) return;
    const dt = new DataTransfer();
    for (const f of Array.from(files)) dt.items.add(f);
    try {
      const nuevos = await bloquesDelPortapapeles(dt);
      if (!nuevos) { fallar('No se ha podido subir ese archivo.'); return; }
      const tras = archivoTras.current ? bloquesRef.current.find(x => x.id === archivoTras.current) ?? null : null;
      insertarBloques(tras, nuevos, false);
    } catch (e: any) { fallar(e.message || 'No se pudo subir.'); }
    finally { setSubiendo(null); if (archivoRef.current) archivoRef.current.value = ''; }
  };

  /** Una pizarra nueva: se crea como borrador (se ve cuando la página se
   *  publica, ver `pizarraVisible`) y queda incrustada donde estaba el «+». */
  const crearPizarra = async (tras: string | null) => {
    setMenuAbierto(null);
    const r = await fetch('/api/graphs', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titulo ? `Pizarra · ${titulo}`.slice(0, 120) : 'Pizarra', status: 'borrador' }),
    });
    const g = await r.json().catch(() => ({}));
    if (!r.ok || !g.id) { fallar(g.error || 'No se pudo crear la pizarra.'); return; }
    const nuevo: Bloque = { id: nuevoIdBloque(), tipo: 'pizarra', entityId: g.id, pubTitulo: g.title };
    setBloques(bs => {
      const { pos, nivel } = puntoInsercion(bs, tras);
      const copia = [...bs];
      copia.splice(pos, 0, { ...nuevo, nivel: nivel || undefined });
      return copia;
    });
    programarGuardado();
  };

  /** Una página nueva dentro de ésta: se crea, se enlaza y se abre. */
  const crearSubpagina = async (tras: string | null) => {
    setMenuAbierto(null);
    const r = await fetch('/api/documentos', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Sin título' }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) { fallar(j.error || 'No se pudo crear la página.'); return; }
    const nuevo: Bloque = { id: nuevoIdBloque(), tipo: 'subpagina', entityId: j.id, pubTitulo: 'Sin título' };
    const lista = serializar();
    const { pos, nivel } = puntoInsercion(lista, tras);
    lista.splice(pos, 0, { ...nuevo, nivel: nivel || undefined });
    setBloques(lista);
    await guardarAhora(lista);
    navigate(`/paginas/${j.id}`);
  };

  // ⌘Z deshace y ⌘⇧Z (o ⌘Y) rehace, estés escribiendo en un bloque o no.
  // Lo que se queda fuera es lo que tiene su propia historia: el título y
  // los campos de texto (el navegador), y una pizarra incrustada (la suya).
  useEffect(() => {
    const esMio = () => {
      const activo = document.activeElement as HTMLElement | null;
      if (document.querySelector('[data-pizarra-activa]')) return false;
      if (activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA' || activo.tagName === 'SELECT')) return false;
      if (activo?.isContentEditable && !docRef.current?.contains(activo)) return false;
      return true;
    };
    const tecla = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      const quiere = k === 'z' ? (e.shiftKey ? 'rehacer' : 'deshacer') : k === 'y' && !e.shiftKey ? 'rehacer' : null;
      if (!quiere || !puedoEditar || ajustes.bloqueada || !esMio()) return;
      e.preventDefault();
      if (quiere === 'deshacer') deshacer(); else rehacer();
    };
    // «Deshacer» del menú Edición del navegador, o el gesto de agitar: llega
    // como `beforeinput` y no como tecla.
    const antes = (e: InputEvent) => {
      if (e.inputType !== 'historyUndo' && e.inputType !== 'historyRedo') return;
      if (!docRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      if (e.inputType === 'historyUndo') deshacer(); else rehacer();
    };
    window.addEventListener('keydown', tecla);
    window.addEventListener('beforeinput', antes as any);
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('beforeinput', antes as any); };
  });

  // ⌘F BUSCA EN LA PÁGINA, y «?» ENSEÑA LOS ATAJOS (2026-10-06, #29 y #30).
  // El ⌘F del navegador no ve lo escondido ni distingue el texto de la página
  // del de los menús; «?» sólo cuenta fuera de un texto (en un texto es un «?»).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const sel = window.getSelection()?.toString().trim() || '';
        setBuscando(b => ({ q: sel && sel.length <= 80 && !sel.includes('\n') ? sel : (b?.q || ''), senal: (b?.senal || 0) + 1 }));
      } else if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !enCampoDeTexto(e.target)) {
        e.preventDefault();
        setAtajosAbiertos(true);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  // EL GRUPO DE TECLAS (ver «DESHACER Y REHACER» arriba). `beforeinput` llega
  // ANTES de que la letra entre: es el momento de la foto de «antes», con el
  // cursor todavía donde estaba. Y `input`, que en `document` llega DESPUÉS de
  // que el bloque haya apuntado su texto, renueva el presente.
  useEffect(() => {
    if (!puedoEditar) return;
    const deQuien = (t: EventTarget | null) => {
      const el = (t as HTMLElement | null)?.closest?.('[data-bloque],[data-celda-de]') as HTMLElement | null;
      if (!el || !docRef.current?.contains(el)) return null;
      return el.dataset.bloque || el.dataset.celdaDe || null;
    };
    const antes = (e: InputEvent) => {
      if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') return;
      const id = deQuien(e.target);
      if (!id) return;
      const ahora = Date.now();
      const g = grupoTexto.current;
      const espacio = e.data === ' ' || e.inputType === 'insertParagraph';
      const sigue = g && g.id === id && ahora - g.ultima < 1000 && !(espacio && ahora - g.desde > 4000);
      if (sigue) { g!.ultima = ahora; return; }
      apilar(fotoAhora());
      grupoTexto.current = { id, desde: ahora, ultima: ahora };
    };
    const despues = (e: Event) => { if (deQuien(e.target)) presente.current = fotoAhora(); };
    document.addEventListener('beforeinput', antes as any);
    document.addEventListener('input', despues);
    return () => { document.removeEventListener('beforeinput', antes as any); document.removeEventListener('input', despues); };
  });

  // Cada cambio de estructura apila la foto de antes —que es `presente`—, sea
  // cual sea la función que lo hizo. Así ninguna puede olvidarse de hacerlo.
  useEffect(() => {
    // En vivo no hay fotos de la página entera: serían de los demás también.
    if (colabVivo()) { sinRegistrar.current = false; return; }
    if (sinRegistrar.current || generando || !presente.current) {
      sinRegistrar.current = false;
      presente.current = fotoAhora();
      return;
    }
    const ahora = fotoAhora();
    if (JSON.stringify(ahora.bloques) === JSON.stringify(presente.current.bloques)) return;
    apilar(presente.current);
    grupoTexto.current = null;
    presente.current = ahora;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloques]);

  // MOVIDA DESDE EL MENÚ (2026-10-05, `ArbolPaginas.tsx`). El servidor ya ha
  // cambiado los bloques; aquí se pone igual lo que hay en pantalla, porque el
  // próximo autoguardado escribiría la copia de antes y desharía el cambio.
  useEffect(() => {
    const oir = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!d.id || d.id === docId.current) return;
      setBloques(bs => {
        const sin = bs.filter(b => !(b.tipo === 'subpagina' && b.entityId === d.id));
        if (d.dentro_de === docId.current) return [...sin, { id: nuevoIdBloque(), tipo: 'subpagina', entityId: d.id, pubTitulo: d.titulo || 'Sin título' } as Bloque];
        return sin.length === bs.length ? bs : sin;
      });
    };
    window.addEventListener('humanity:pagina-movida', oir);
    // Una base de datos llevada desde el menú (2026-10-05): sale de aquí, o
    // llega aquí, y la pantalla se pone igual sin volver a guardar.
    const bloque = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!d.bloque || !docId.current) return;
      if (d.desde === docId.current) setBloques(bs => { const fuera = idsSubarbol(bs, d.bloque.id); return normalizarNiveles(bs.filter(b => !fuera.includes(b.id))); });
      if (d.a === docId.current) {
        // Puede traer hijos (un desplegable con lo suyo): se aplana.
        const llegan = aplanar([d.bloque]);
        for (const x of llegan) if (x.texto !== undefined) textosRef.current[x.id] = x.texto;
        setBloques(bs => (bs.some(b => b.id === d.bloque.id) ? bs : [...bs, ...llegan]));
      }
    };
    window.addEventListener('humanity:bloque-movido', bloque);
    return () => { window.removeEventListener('humanity:pagina-movida', oir); window.removeEventListener('humanity:bloque-movido', bloque); };
  }, []);

  // -- Fase 2: buscador de publicaciones para embeber -------------------------
  useEffect(() => {
    if (buscadorPub === null) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (busquedaPub.trim()) p.set('q', busquedaPub.trim());
      const url = buscaProducto ? `/api/products?${p}` : `/api/publicaciones?${p}`;
      fetch(url, { credentials: 'include' })
        .then(r => r.json())
        .then(j => {
          const lista = Array.isArray(j) ? j : (j?.products || j?.items || []);
          setResultadosPub(lista
            .filter((x: any) => x.id !== docId.current && (!soloMapas || x.tipo === 'mapa'))
            .map((x: any) => buscaProducto ? { ...x, tipo: 'producto', titulo: x.name || x.nombre } : x)
            .slice(0, 12));
        })
        .catch(() => setResultadosPub([]));
    }, 250);
    return () => clearTimeout(t);
  }, [buscadorPub, busquedaPub, soloMapas]);

  const embeber = (pub: any) => {
    const rutaDe: Record<string, string> = { lienzo: '/esquemas/', mapa: '/mapas/', proyecto: '/carpetas/' };
    const nuevo: Bloque = {
      id: nuevoIdBloque(),
      tipo: pub.tipo === 'producto' ? 'producto' : 'publicacion',
      pubTipo: pub.tipo,
      entityId: pub.id,
      pubKind: pub.kind || pub.tipo,
      pubTitulo: pub.titulo || pub.title || 'Publicación',
      pubAutor: pub.autor_nombre || undefined,
      pubUrl: pub.tipo === 'producto' ? `/mercado?producto=${pub.id}`
        : pub.tipo === 'ventana' && pub.kind === 'pagina' ? `/paginas/${pub.id}`
        : rutaDe[pub.tipo] ? `${rutaDe[pub.tipo]}${pub.slug || pub.id}` : undefined,
    };
    setBloques(bs => {
      if (buscadorPub === '') return [...bs, nuevo];
      const { pos, nivel } = puntoInsercion(bs, buscadorPub);
      const copia = [...bs];
      copia.splice(pos, 0, { ...nuevo, nivel: nivel || undefined });
      return copia;
    });
    setBuscadorPub(null);
    programarGuardado();
  };

  // Contenido real de una ventana embebida (tabla, imagen, gráfica…): se
  // carga una vez y se enseña con el MISMO renderer del resto de la app.
  useEffect(() => {
    const pendientes = bloques.filter(b =>
      b.tipo === 'publicacion' && b.pubTipo === 'ventana' && b.entityId && !(b.entityId in ventanasEmbebidas));
    if (!pendientes.length) return;
    for (const b of pendientes) {
      setVentanasEmbebidas(v => ({ ...v, [b.entityId!]: null })); // marcada como en curso
      fetch(`/api/windows/${b.entityId}`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
        .then(j => setVentanasEmbebidas(v => ({ ...v, [b.entityId!]: j })))
        .catch(() => {});
    }
  }, [bloques, ventanasEmbebidas]);

  // -- Fase 2: IA dentro del documento ---------------------------------------
  const iaMejorar = async (b: Bloque) => {
    if (!docId.current) return;
    setIaOcupada(b.id);
    setMenuAbierto(null);
    try {
      const r = await fetch('/api/ai/documento-bloque', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_id: docId.current, accion: 'mejorar', texto: textosRef.current[b.id] ?? b.texto ?? '' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      textosRef.current[b.id] = j.texto;
      setBloques(bs => bs.map(x => x.id === b.id ? { ...x, texto: j.texto } : x));
      await guardarAhora();
    } catch (e: any) {
      fallar(e.message);
    } finally {
      setIaOcupada(null);
    }
  };

  const iaContinuar = async () => {
    if (!docId.current) return;
    setIaOcupada('continuar');
    try {
      // Lo escrito hasta ahora viaja guardado antes de pedir la continuación.
      await guardarAhora();
      const r = await fetch('/api/ai/documento-bloque', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_id: docId.current, accion: 'continuar' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const nuevos: Bloque[] = aplanar(j.bloques || []);
      for (const n of nuevos) if (n.texto !== undefined) textosRef.current[n.id] = n.texto;
      setBloques(bs => [...bs, ...nuevos]);
      programarGuardado();
      setTimeout(() => finalRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      fallar(e.message);
    } finally {
      setIaOcupada(null);
    }
  };

  // -- Fase 2: exportar a Word, PDF y PNG ------------------------------------
  const descargarPng = async () => {
    setMenuDescargar(false);
    if (!docRef.current) return;
    // html2canvas solo se descarga cuando alguien exporta a imagen: no debe
    // pagarlo quien nunca lo usa.
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(docRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${titulo.replace(/[^a-zA-Z0-9áéíóúñ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'documento'}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  // ══ SUBIDAS CON PROGRESO (2026-10-01) ══════════════════════════════════
  // Eugenio: con una imagen pesada «parece que no está haciendo nada», y uno
  // cancela, sale o la vuelve a subir. Mientras sube se enseña la propia foto
  // (en local, al instante) con una barra y el porcentaje.
  const [subidas, setSubidas] = useState<Record<string, { fraccion: number; vista: string | null }>>({});
  const conProgreso = async (clave: string, archivo: File) => {
    const vista = archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null;
    setSubidas(s => ({ ...s, [clave]: { fraccion: 0, vista } }));
    try {
      return await subirArchivo(archivo, undefined, f => setSubidas(s => (s[clave] ? { ...s, [clave]: { ...s[clave], fraccion: f } } : s)));
    } finally {
      setSubidas(s => { const n = { ...s }; delete n[clave]; return n; });
      if (vista) setTimeout(() => URL.revokeObjectURL(vista), 5000);
    }
  };
  // Salir a mitad de una subida la pierde: el navegador pregunta antes.
  const haySubidas = Object.keys(subidas).length > 0;
  useEffect(() => {
    if (!haySubidas) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [haySubidas]);

  const subirPortada = async (archivo: File) => {
    const sub = await conProgreso('portada', archivo);
    if (sub.error) { fallar(sub.error); return; }
    setPortada(sub.url);
    programarGuardado();
  };

  const ES_TEXTO: TipoBloque[] = ['parrafo', 'titulo1', 'titulo2', 'titulo3', 'lista', 'numerada', 'tarea', 'cita'];

  const alTeclear = (b: Bloque, e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = e.currentTarget;

    // ⌘D duplica el bloque, como en Notion.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicar(b.id); return; }

    // TAB SANGRA Y ⇧TAB QUITA LA SANGRÍA (2026-10-05), en cualquier bloque.
    // En el código, Tab es un tabulador: ahí se escribe código.
    if (e.key === 'Tab' && !(barra && barra.bloque === b.id) && b.tipo !== 'codigo') {
      e.preventDefault();
      guardarHistoria();
      sangrar([b.id], e.shiftKey ? -1 : 1);
      return;
    }

    // ⌘A SELECCIONA ESTE BLOQUE, NO EL DOCUMENTO ENTERO (2026-08-20). El
    // «seleccionar todo» del navegador se lleva por delante media página; al
    // escribir encima, el navegador borraba nodos de OTROS bloques que React
    // creía suyos, y su siguiente `removeChild` reventaba con la pantalla en
    // blanco. Acotarlo al bloque es además lo que hace cualquier editor.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const rango = document.createRange();
      rango.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(rango);
      return;
    }

    // --- La barra «/» manda mientras está abierta ---
    if (barra && barra.bloque === b.id) {
      if (e.key === 'Escape') { e.preventDefault(); setBarra(null); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = opcionesBarra.length || 1;
        setBarra(x => x && ({ ...x, elegido: (x.elegido + (e.key === 'ArrowDown' ? 1 : n - 1)) % n }));
        return;
      }
      if (e.key === 'Enter' && opcionesBarra.length) {
        e.preventDefault();
        elegirDeLaBarra(b, opcionesBarra[Math.min(barra.elegido, opcionesBarra.length - 1)].tipo);
        return;
      }
      // Cualquier otra tecla sigue escribiendo: el filtro se recalcula en
      // `onInput`, que es quien ve el texto ya actualizado.
    } else if (e.key === '/' && !(el.textContent || '').trim()) {
      // Solo en un bloque VACÍO, como Notion: en mitad de una frase, «/» es
      // una barra y punto (fechas, «y/o», direcciones…).
      setBarra({ bloque: b.id, texto: '', elegido: 0 });
    }

    if (e.key === 'Enter' && !e.shiftKey && b.tipo !== 'codigo') {
      e.preventDefault();
      const heredan: TipoBloque[] = ['lista', 'numerada', 'tarea'];
      const texto = el.textContent || '';
      // Enter en un ítem vacío de lista: si está sangrado sale un nivel, y si
      // no, pasa a párrafo. Como Notion.
      if (heredan.includes(b.tipo) && !texto.trim()) {
        guardarHistoria();
        if (b.nivel) { sangrar([b.id], -1); return; }
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo: 'parrafo' } : x));
        programarGuardado();
        return;
      }
      // Enter PARTE el texto por el cursor: lo de antes se queda, lo de
      // después baja al bloque nuevo con el cursor a su inicio (como Notion).
      // Una ecuación no se parte: partir un TeX por el medio lo rompe.
      const corte = b.tipo === 'ecuacion' ? texto.length : offsetCaret(el);
      const antes = texto.slice(0, corte);
      const despues = texto.slice(corte);
      textosRef.current[b.id] = antes;
      const nuevo: Bloque = { id: nuevoIdBloque(), tipo: heredan.includes(b.tipo) ? b.tipo : 'parrafo', texto: despues };
      textosRef.current[nuevo.id] = despues;
      guardarHistoria();
      setBloques(bs => {
        // Detrás de un desplegable abierto (o de un bloque con hijos) el
        // nuevo va DENTRO, el primero; si no, de hermano, con su sangría.
        const { pos, nivel } = puntoInsercion(bs, b.id);
        const dentro = nivel > (bs.find(x => x.id === b.id)?.nivel || 0);
        const copia = bs.map(x => x.id === b.id ? { ...x, texto: antes } : x);
        copia.splice(pos, 0, { ...nuevo, tipo: dentro && !heredan.includes(b.tipo) ? 'parrafo' : nuevo.tipo, nivel: nivel || undefined });
        return copia;
      });
      setBloqueActivo(nuevo.id);
      posicionCaret.current = 0;
      setFocoId(nuevo.id);
      programarGuardado();
    } else if (e.key === 'Backspace') {
      const texto = el.textContent || '';
      const alPrincipio = !texto || offsetCaret(el) === 0;
      // RETROCESO AL PRINCIPIO, POR PASOS, COMO NOTION (2026-10-05):
      //  1. una lista, un título, una cita… vuelve a ser texto normal;
      //  2. un bloque sangrado sale un nivel;
      //  3. y sólo entonces se junta con el de encima (o se borra si está vacío).
      const VUELVEN: TipoBloque[] = ['lista', 'numerada', 'tarea', 'cita', 'titulo1', 'titulo2', 'titulo3', 'desplegable'];
      if (alPrincipio && VUELVEN.includes(b.tipo) && !window.getSelection()?.toString()) {
        e.preventDefault();
        guardarHistoria();
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo: 'parrafo', plegable: undefined, hecho: undefined } : x));
        posicionCaret.current = 0;
        setFocoId(b.id);
        programarGuardado();
        return;
      }
      if (alPrincipio && b.nivel && !window.getSelection()?.toString()) {
        e.preventDefault();
        guardarHistoria();
        sangrar([b.id], -1);
        posicionCaret.current = 0;
        setFocoId(b.id);
        return;
      }
      if (!texto) {
        e.preventDefault();
        guardarHistoria();
        eliminar(b.id);
        return;
      }
      // Backspace con el cursor al principio FUSIONA con el bloque de texto
      // anterior, dejando el cursor en la juntura (como Notion). El de
      // «encima» es el que se VE encima: lo de un desplegable cerrado no.
      if (offsetCaret(el) === 0) {
        const i = visibles.findIndex(x => x.id === b.id);
        const anterior = visibles[i - 1];
        if (anterior && ES_TEXTO.includes(anterior.tipo)) {
          e.preventDefault();
          const textoAnterior = textosRef.current[anterior.id] ?? anterior.texto ?? '';
          const fusionado = textoAnterior + texto;
          guardarHistoria();
          textosRef.current[anterior.id] = fusionado;
          delete textosRef.current[b.id];
          setBloques(bs => normalizarNiveles(bs
            .map(x => x.id === anterior.id ? { ...x, texto: fusionado } : x)
            .filter(x => x.id !== b.id)));
          setBloqueActivo(anterior.id);
          posicionCaret.current = textoAnterior.length;
          setFocoId(anterior.id);
          programarGuardado();
        }
      }
    }
  };

  /** Atajos markdown al teclear a principio de línea: «# », «- », «1. »… */
  const autoformato = (b: Bloque, el: HTMLDivElement) => {
    if (b.tipo !== 'parrafo') return;
    const texto = el.textContent || '';
    const reglas: [RegExp, TipoBloque][] = [
      [/^###\s/, 'titulo3'], [/^##\s/, 'titulo2'], [/^#\s/, 'titulo1'],
      [/^[-*]\s/, 'lista'], [/^1[.)]\s/, 'numerada'], [/^>\s/, 'cita'],
      [/^\[\s?\]\s/, 'tarea'], [/^```/, 'codigo'], [/^\$\$\s/, 'ecuacion'],
    ];
    for (const [re, tipo] of reglas) {
      if (re.test(texto)) {
        const limpio = texto.replace(re, '');
        // Deshacer un atajo devuelve lo tecleado («# » incluido), como en
        // Notion: la foto de antes lleva el texto en crudo.
        const antes = fotoAhora();
        antes.bloques = antes.bloques.map(x => (x.id === b.id ? { ...x, texto } : x));
        apilar(antes);
        sinRegistrar.current = true;
        grupoTexto.current = null;
        textosRef.current[b.id] = limpio;
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo, texto: limpio } : x));
        // El cursor, donde estaba menos lo que se ha comido el atajo.
        posicionCaret.current = Math.max(0, offsetCaret(el) - (texto.length - limpio.length));
        setFocoId(b.id);
        programarGuardado();
        return;
      }
    }
  };

  /**
   * Los bloques que salen de lo pegado, cuando NO es texto suelto: una imagen,
   * un vídeo, un PDF… Devuelve `null` si el portapapeles no traía nada de eso,
   * para que el pegado siga su camino normal de texto.
   *
   * Quién decide qué es cada cosa vive en `utils/pegado.ts`, el mismo módulo
   * que usa el lienzo: pegar el mismo PDF da lo mismo en los dos sitios.
   */
  const bloquesDelPortapapeles = useCallback(async (dt: DataTransfer): Promise<Bloque[] | null> => {
    const piezas = await leerPegado(dt, (hecho, total, nombre) => {
      setSubiendo(total > 1 ? `Subiendo ${hecho + 1} de ${total}…` : `Subiendo ${nombre.slice(0, 28)}…`);
    });
    const out: Bloque[] = [];
    for (const p of piezas) {
      const id = nuevoIdBloque();
      switch (p.clase) {
        case 'imagen': out.push({ id, tipo: 'imagen', url: p.url, pie: undefined }); break;
        case 'video': out.push({ id, tipo: 'medio', medio: 'video', url: p.url, pie: p.nombre }); break;
        case 'youtube': out.push({ id, tipo: 'medio', medio: 'youtube', medioId: p.id }); break;
        case 'vimeo': out.push({ id, tipo: 'medio', medio: 'vimeo', medioId: p.id }); break;
        case 'audio': out.push({ id, tipo: 'medio', medio: 'audio', url: p.url, pie: p.nombre }); break;
        case 'pdf': out.push({ id, tipo: 'medio', medio: 'pdf', url: p.url, pie: p.nombre, medioBytes: p.bytes }); break;
        case 'archivo': out.push({ id, tipo: 'medio', medio: 'archivo', url: p.url, pie: `${p.nombre} · ${tamanoLegible(p.bytes)}`, medioBytes: p.bytes }); break;
        // Un enlace o un texto sueltos son texto: que los trate el camino
        // normal, que ya sabe partir markdown en varios bloques.
        default: return null;
      }
    }
    return out.length ? out : null;
  }, []);

  /** Mete unos bloques recién creados detrás (o encima) del bloque actual.
   *  Con `b = null` van al final del documento: es lo que hace falta cuando se
   *  pega sin haber pinchado en ninguna línea. */
  const insertarBloques = useCallback((b: Bloque | null, nuevos: Bloque[], vacio: boolean) => {
    // Lo pegado puede venir anidado (una lista con sangría): se aplana.
    nuevos = aplanar(nuevos);
    for (const n of nuevos) if (n.texto !== undefined) textosRef.current[n.id] = n.texto;
    setBloques(bs => {
      if (!b) return [...bs, ...nuevos];
      const i = bs.findIndex(x => x.id === b.id);
      if (i < 0) return [...bs, ...nuevos];
      const copia = [...bs];
      // Sobre un bloque vacío lo sustituyen (y heredan su columna y su
      // sangría); con texto, van detrás, donde iría un bloque nuevo.
      if (vacio && b.grupo && nuevos.length === 1) nuevos = [{ ...nuevos[0], grupo: b.grupo }];
      const { pos, nivel } = vacio ? { pos: i, nivel: bs[i].nivel || 0 } : puntoInsercion(bs, b.id);
      const conNivel = nuevos.map(n => ({ ...n, nivel: ((n.nivel || 0) + nivel) || undefined }));
      copia.splice(pos, vacio ? 1 : 0, ...conNivel);
      return normalizarNiveles(copia);
    });
    if (b && vacio) delete textosRef.current[b.id];
    const ultimo = nuevos[nuevos.length - 1];
    setBloqueActivo(ultimo.id);
    setFocoId(ultimo.id);
    programarGuardado();
  }, [programarGuardado]);

  /** ══ SOLTAR UN ARCHIVO EN EL DOCUMENTO (2026-08-22) ═══════════════════
   *  Eugenio: «permite en el constructor de páginas estilo Notion arrastrar un
   *  archivo y que se inserte en la página».
   *
   *  PASA POR EL MISMO SITIO QUE PEGAR. Arrastrar y pegar traen exactamente lo
   *  mismo —un `DataTransfer` con ficheros dentro—, así que arrastrar un PDF y
   *  pegarlo no pueden dar resultados distintos. Un segundo camino con su
   *  propia lista de tipos habría sido el sitio donde el .webp funciona pegado
   *  y no arrastrado.
   *
   *  NO SE QUEDA CON LOS ARRASTRES DE DENTRO. Los bloques se recolocan
   *  arrastrándolos, y ese arrastre no lleva ficheros; si esto se los quedara,
   *  reordenar dejaría de funcionar el día que se implementó subir archivos. */
  const traeArchivos = (dt: DataTransfer | null) =>
    !!dt && (Array.from(dt.types || []).includes('Files') || (dt.files?.length ?? 0) > 0);

  const alSoltarArchivos = async (e: React.DragEvent) => {
    if (arrastrando || !traeArchivos(e.dataTransfer)) return;
    e.preventDefault();
    setArchivoEncima(false);
    if (!editable) { fallar('Esta página es de solo lectura: no se pueden añadir archivos.'); return; }
    try {
      const nuevos = await bloquesDelPortapapeles(e.dataTransfer);
      // `null` = no traía nada que sepamos incrustar. Se dice, en vez de
      // tragárselo en silencio: soltar algo y que no pase nada es el fallo que
      // nadie sabe reportar.
      if (!nuevos?.length) { fallar('De eso que has soltado no sé hacer un bloque.'); return; }
      insertarBloques(null, nuevos, false);
    } finally {
      setSubiendo(null);
    }
  };

  /** Pegar varias líneas crea varios bloques, pasando por el mismo parser
   *  markdown de siempre — pegar una lista pega una lista de verdad. Y desde
   *  2026-08-19, pegar una imagen, un vídeo o un PDF crea su bloque. */
  // ══ MENCIONES CON @ Y [[ (2026-10-06, #6) ═══════════════════════════════
  // Mientras se escribe, `onInput` mira si el cursor está tras un «@» o un
  // «[[» (`detectarMencion`) y abre el selector (`MencionesMenu`). Al elegir,
  // lo escrito desde el disparador se cambia por el enlace markdown de la
  // mención. El texto vive en el DOM: se reescribe ahí y se avisa con un
  // `input`, para que todo lo demás (guardado, historia, formato) lo vea
  // como si se hubiera tecleado.
  /** Lo que se está tecleando en una ecuación, para su vista previa en vivo. */
  const [texEnVivo, setTexEnVivo] = useState<{ id: string; tex: string } | null>(null);
  const [menc, setMenc] = useState<{ bloque: string; tipo: '@' | '[['; desde: number; q: string; x: number; y: number } | null>(null);
  const cerrarMenc = useCallback(() => setMenc(null), []);
  const vigilarMencion = (b: Bloque, el: HTMLElement) => {
    if (b.tipo === 'codigo' || b.tipo === 'ecuacion') { setMenc(null); return; }
    const total = el.textContent || '';
    const cursor = offsetCaret(el);
    const d = detectarMencion(total.slice(0, cursor));
    if (!d) { setMenc(null); return; }
    setMenc(m => {
      if (m && m.bloque === b.id && m.desde === d.desde && m.tipo === d.tipo) return { ...m, q: d.q };
      const sel = window.getSelection();
      const r = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
      const caja = el.getBoundingClientRect();
      return { bloque: b.id, tipo: d.tipo, desde: d.desde, q: d.q, x: (r && r.left) || caja.left, y: (r && r.bottom) || caja.bottom };
    });
  };
  const aplicarMencion = (md: string) => {
    const m = menc;
    setMenc(null);
    if (!m) return;
    const el = document.querySelector(`[data-bloque="${m.bloque}"]`) as HTMLElement | null;
    if (!el) return;
    const total = el.textContent || '';
    const hasta = offsetCaret(el);
    // Un espacio detrás para seguir escribiendo, salvo que ya lo haya.
    const cola = total.slice(hasta);
    const nuevo = total.slice(0, m.desde) + md + (cola.startsWith(' ') ? '' : ' ') + cola;
    el.textContent = nuevo;
    repintar(el, null);
    ponerCursor(el, m.desde + md.length + 1);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' ' }));
  };

  // ── EL MENÚ DE «¿QUÉ HAGO CON ESTE ENLACE?» (2026-10-02) ────────────────
  const [menuEnlace, setMenuEnlace] = useState<{
    bloqueId: string; url: string; x: number; y: number;
    video: { medio: 'youtube' | 'vimeo'; id: string } | null;
    /** Un servicio de terceros que se incrusta (Figma, Spotify…): ver `utils/embeds.ts`. */
    embed?: Embed | null;
    /** ¿La web se deja meter en otra? `null` mientras se comprueba. */
    insertable: boolean | null;
    elegido: number;
  } | null>(null);
  /** Lo leído de cada enlace pegado, para no pedirlo dos veces. */
  const lecturasEnlace = useRef<Record<string, Promise<Awaited<ReturnType<typeof leerEnlace>>>>>({});
  const [leyendoEnlace, setLeyendoEnlace] = useState<string[]>([]);

  const abrirMenuEnlace = (bloqueId: string, url: string) => {
    const sel = window.getSelection();
    const r = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    const caja = document.querySelector(`[data-bloque="${bloqueId}"]`)?.getBoundingClientRect();
    const x = Math.min((r && r.left) || caja?.left || 100, window.innerWidth - 300);
    const y = ((r && r.bottom) || caja?.bottom || 100) + 6;
    const yt = idYoutube(url), vm = idVimeo(url);
    const video = yt ? { medio: 'youtube' as const, id: yt } : vm ? { medio: 'vimeo' as const, id: vm } : null;
    // Un servicio conocido se ofrece como «Insertar» sin preguntar a la web
    // (muchas no se dejan meter en un marco, y estas tienen su propio incrustador).
    const embed = video ? null : embedDe(url);
    setMenuEnlace({ bloqueId, url, x, y, video, embed, insertable: video || embed ? true : null, elegido: 0 });
    if (!video && !embed) {
      const p = lecturasEnlace.current[url] ||= leerEnlace(url);
      p.then(l => setMenuEnlace(m => m && m.url === url ? { ...m, insertable: l ? l.insertable : false } : m));
    }
  };

  /** Rellena un marcador con lo que se lea de su web. */
  const completarMarcador = (bid: string, url: string) => {
    setLeyendoEnlace(l => [...l, bid]);
    const p = lecturasEnlace.current[url] ||= leerEnlace(url);
    p.then(l => {
      setLeyendoEnlace(x => x.filter(i => i !== bid));
      if (!l) return;
      setBloques(bs => bs.map(x => x.id === bid ? { ...x, ...l.campos } : x));
      programarGuardado();
    });
  };

  /** 0 = dejar como enlace · 1 = marcador · 2 = insertar. */
  const elegirEnlace = (op: number) => {
    const m = menuEnlace;
    setMenuEnlace(null);
    if (!m || op === 0) return;
    if (op === 2 && m.insertable === false) return;
    const b = bloquesRef.current.find(x => x.id === m.bloqueId);
    if (!b) return;
    // El enlace sale del texto: ahora es otro bloque.
    const actual = textosRef.current[b.id] ?? b.texto ?? '';
    const i = actual.lastIndexOf(m.url);
    const resto = i >= 0 ? (actual.slice(0, i) + actual.slice(i + m.url.length)).replace(/\s+$/, '') : actual;
    const nuevo: Bloque = op === 1
      ? { id: nuevoIdBloque(), tipo: 'marcador', url: m.url }
      : m.video
        ? { id: nuevoIdBloque(), tipo: 'medio', medio: m.video.medio, medioId: m.video.id } as Bloque
        : m.embed
          ? { id: nuevoIdBloque(), tipo: 'embed', url: m.url, alto: m.embed.alto }
          : { id: nuevoIdBloque(), tipo: 'web', url: m.url, alto: 480 };
    if (!resto.trim()) {
      insertarBloques(b, [nuevo], true);
    } else {
      textosRef.current[b.id] = resto;
      setBloques(bs => bs.map(x => x.id === b.id ? { ...x, texto: resto } : x));
      setBloqueActivo(null);
      insertarBloques({ ...b, texto: resto }, [nuevo], false);
    }
    if (nuevo.tipo === 'marcador' || nuevo.tipo === 'web') completarMarcador(nuevo.id, m.url);
  };

  // Teclado del menú: flechas, Intro y Escape. Cualquier otra tecla lo cierra
  // y sigue escribiendo, como en Notion.
  useEffect(() => {
    if (!menuEnlace) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setMenuEnlace(m => m && ({ ...m, elegido: (m.elegido + (e.key === 'ArrowDown' ? 1 : 2)) % 3 }));
      } else if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        elegirEnlace(menuEnlace.elegido);
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); setMenuEnlace(null);
      } else if (!['Shift', 'Meta', 'Control', 'Alt'].includes(e.key)) {
        setMenuEnlace(null);
      }
    };
    const fuera = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.('[data-menu-enlace]')) setMenuEnlace(null); };
    window.addEventListener('keydown', tecla, true);
    window.addEventListener('mousedown', fuera, true);
    return () => { window.removeEventListener('keydown', tecla, true); window.removeEventListener('mousedown', fuera, true); };
  });

  const alPegar = (b: Bloque, e: React.ClipboardEvent<HTMLDivElement>) => {
    const texto = e.clipboardData.getData('text/plain');

    // ¿Trae algo que NO sea texto suelto? Un archivo, una imagen copiada de
    // una web, o un enlace que es inequívocamente un medio (YouTube, Vimeo, un
    // .mp4, un .pdf): eso se incrusta. Un enlace normal sigue siendo un enlace.
    const dt = e.clipboardData;
    const url = texto.trim();
    const esEnlace = /^https?:\/\/\S+$/i.test(url);
    // Un archivo enlazado directamente (una foto, un PDF) se sigue incrustando
    // solo: ahí no hay nada que elegir.
    const enlaceDeMedio = esEnlace && /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov|m4v|ogv|mp3|m4a|ogg|wav|aac|flac|pdf)(\?|#|$)/i.test(url);

    // ── UN ENLACE: SE PEGA, Y SE PREGUNTA QUÉ HACER CON ÉL (2026-10-02) ────
    // Como Notion: el enlace entra como texto y aparece un menú con «dejarlo
    // así», «marcador» (tarjeta con imagen, título y descripción) e «insertar»
    // (la web o el vídeo dentro de la página). Se pega a mano como texto
    // plano: el pegado del navegador, con HTML, metería un enlace con otro
    // texto y la dirección se perdería.
    // PEGAR UN BLOQUE SINCRONIZADO copiado en otra página (2026-10-06).
    const sinc = url.match(/^humanity-sincronizado:([A-Z0-9]+)$/i);
    if (sinc) {
      e.preventDefault();
      insertarSincronizado(b.id, sinc[1], !(e.currentTarget.textContent || '').trim() ? b.id : undefined);
      return;
    }

    if (esEnlace && !enlaceDeMedio && b.tipo !== 'codigo' && !dt.files?.length) {
      e.preventDefault();
      document.execCommand('insertText', false, url);
      abrirMenuEnlace(b.id, url);
      return;
    }

    if (dt.files?.length || dt.getData('text/html') || enlaceDeMedio) {
      const vacio = !(e.currentTarget.textContent || '').trim();
      // Se lanza AHORA: `clipboardData` se vacía en cuanto termina el evento,
      // así que no se puede esperar al `await` para mirarlo.
      bloquesDelPortapapeles(dt).then(nuevos => {
        setSubiendo(null);
        if (nuevos?.length) insertarBloques(b, nuevos, vacio);
      }).catch((err: any) => {
        setSubiendo(err.message || 'No se pudo pegar.');
        setTimeout(() => setSubiendo(null), 5000);
      });
      // Se corta el pegado normal cuando SEGURO que hay algo que incrustar.
      // Con HTML suelto (texto con formato copiado de una web) el navegador
      // debe seguir pegando el texto: puede que no hubiera ninguna imagen.
      if (dt.files?.length || enlaceDeMedio) { e.preventDefault(); return; }
    }

    if (!texto.includes('\n') || b.tipo === 'codigo') return; // pegado normal
    e.preventDefault();
    const nuevos = markdownABloques(texto);
    if (!nuevos.length) return;
    insertarBloques(b, nuevos, !(e.currentTarget.textContent || '').trim());
  };

  /**
   * ⌘V SIN HABER PINCHADO EN NINGUNA LÍNEA (2026-08-19). Solo el bloque activo
   * es editable —así no se re-renderiza el documento entero en cada tecla—, y
   * eso significa que sin un clic previo el pegado no llegaba a ningún sitio.
   * Aquí se recoge lo que nadie ha atendido y se añade al final.
   */
  useEffect(() => {
    if (!puedoEditar || generando || ajustes.bloqueada) return;
    const alPegarEnLaPagina = (e: ClipboardEvent) => {
      // Trabajando en una pizarra incrustada, lo pegado es suyo.
      if (document.querySelector('[data-pizarra-activa]')) return;
      if (enCampoDeTexto(e.target)) return;   // ya lo atiende el bloque, o es un formulario
      if (!e.clipboardData) return;
      const dt = e.clipboardData;
      if (!dt.files?.length && !(dt.getData('text/plain') || '').trim() && !dt.getData('text/html')) return;
      e.preventDefault();
      const sinc = (dt.getData('text/plain') || '').trim().match(/^humanity-sincronizado:([A-Z0-9]+)$/i);
      if (sinc) { insertarSincronizado(null, sinc[1]); return; }
      bloquesDelPortapapeles(dt).then(nuevos => {
        setSubiendo(null);
        if (nuevos?.length) { insertarBloques(null, nuevos, false); return; }
        // Texto suelto: el mismo parser markdown de siempre, al final.
        const texto = (dt.getData('text/plain') || '').trim();
        const sueltos = texto ? markdownABloques(texto) : [];
        if (sueltos.length) insertarBloques(null, sueltos, false);
      }).catch((err: any) => {
        setSubiendo(err.message || 'No se pudo pegar.');
        setTimeout(() => setSubiendo(null), 5000);
      });
    };
    window.addEventListener('paste', alPegarEnLaPagina);
    return () => window.removeEventListener('paste', alPegarEnLaPagina);
  }, [puedoEditar, generando, ajustes.bloqueada, bloquesDelPortapapeles, insertarBloques]);

  // -- Selección múltiple -----------------------------------------------------
  const clicSeleccion = (b: Bloque, e: React.MouseEvent) => {
    if (!editable || !(e.metaKey || e.ctrlKey || e.shiftKey)) return false;
    e.preventDefault();
    e.stopPropagation();
    setBloqueActivo(null);
    if (e.shiftKey && ultimoSeleccionado.current) {
      const desde = bloques.findIndex(x => x.id === ultimoSeleccionado.current);
      const hasta = bloques.findIndex(x => x.id === b.id);
      if (desde >= 0 && hasta >= 0) {
        const [a, z] = desde <= hasta ? [desde, hasta] : [hasta, desde];
        const rango = bloques.slice(a, z + 1).map(x => x.id);
        setSeleccion(s => [...new Set([...s, ...rango])]);
      }
    } else {
      setSeleccion(s => (s.includes(b.id) ? s.filter(x => x !== b.id) : [...s, b.id]));
    }
    ultimoSeleccionado.current = b.id;
    return true;
  };

  const eliminarSeleccion = useCallback(() => {
    if (!seleccion.length) return;
    setAviso(seleccion.length === 1 ? 'Bloque borrado' : `${seleccion.length} bloques borrados`);
    setBloques(bs => {
      // Lo que va dentro de un bloque marcado se va con él.
      const fuera = new Set(seleccion.flatMap(s => idsSubarbol(bs, s)));
      const restantes = normalizarGrupos(bs.filter(x => !fuera.has(x.id)));
      return restantes.length ? restantes : [{ id: nuevoIdBloque(), tipo: 'parrafo' }];
    });
    for (const id of seleccion) { delete textosRef.current[id]; delete filasRef.current[id]; }
    setSeleccion([]);
    ultimoSeleccionado.current = null;
    programarGuardado();
  }, [seleccion, programarGuardado]);

  // Suprimir/Backspace borra la selección (si no estás tecleando dentro de un
  // bloque) y Escape la deshace.
  useEffect(() => {
    if (!seleccion.length) return;
    const tecla = (e: KeyboardEvent) => {
      const activo = document.activeElement as HTMLElement | null;
      if (activo && (activo.isContentEditable || activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); eliminarSeleccion(); }
      else if (e.key === 'Escape') setSeleccion([]);
      // Tab con varios bloques marcados los sangra todos a la vez.
      else if (e.key === 'Tab') { e.preventDefault(); guardarHistoria(); sangrar(seleccion, e.shiftKey ? -1 : 1); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [seleccion, eliminarSeleccion]);

  // Enfocar el bloque recién creado/activado cuando ya está en el DOM. Por
  // defecto el cursor va al final; `posicionCaret` lo coloca en un punto
  // concreto (partir con Enter deja el cursor al INICIO del bloque nuevo;
  // fusionar con Backspace lo deja en la juntura).
  const posicionCaret = useRef<number | null>(null);
  // `useLayoutEffect` y no `useEffect` (2026-10-05): el cursor tiene que
  // estar en su sitio ANTES de que el navegador atienda la tecla siguiente.
  // Con `useEffect`, al escribir deprisa «- Uno», «Uno» entraba en el bloque
  // y DESPUÉS el cursor saltaba al principio, y el Enter siguiente partía mal.
  useLayoutEffect(() => {
    if (!focoId) return;
    const el = document.querySelector<HTMLElement>(`[data-bloque="${focoId}"]`);
    if (el) {
      el.focus();
      const rango = document.createRange();
      if (posicionCaret.current !== null && el.firstChild) {
        // Con el formato a la vista el texto ya no es un solo nodo: se cuenta
        // en caracteres a través de las etiquetas.
        ponerCursor(el, posicionCaret.current);
        posicionCaret.current = null;
        setFocoId(null);
        return;
      } else if (posicionCaret.current !== null) {
        rango.selectNodeContents(el);
        rango.collapse(true);
      } else {
        rango.selectNodeContents(el);
        rango.collapse(false);
      }
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(rango);
      posicionCaret.current = null;
      setFocoId(null);
    }
  });

  // El menú de los tres puntitos se cierra al pinchar en cualquier otro
  // sitio, como el resto de los menús de la plataforma. Sin esto se quedan dos
  // abiertos a la vez y ninguno parece el que manda.
  useEffect(() => {
    if (!menuMedio) return;
    const fuera = () => setMenuMedio(null);
    window.addEventListener('click', fuera);
    return () => window.removeEventListener('click', fuera);
  }, [menuMedio]);

  /** Dónde está el cursor dentro de un contentEditable, en caracteres. */
  const offsetCaret = (el: HTMLElement): number => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return 0;
    const previo = sel.getRangeAt(0).cloneRange();
    previo.selectNodeContents(el);
    previo.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    return previo.toString().length;
  };

  const subirImagen = async (b: Bloque, archivo: File) => {
    const sub = await conProgreso(b.id, archivo);
    if (sub.error) { fallar(sub.error); return; }
    // Con su peso, para avisar si pasa de 1,5 MB (ver `ImagenBloque.tsx`).
    setBloques(bs => bs.map(x => x.id === b.id ? { ...x, url: sub.url, medioBytes: sub.bytes || undefined } : x));
    programarGuardado();
  };

  // El diálogo de compartir pide PNG y Markdown por evento en vez de recibir
  // las funciones como props: las dos viven aquí porque necesitan el DOM del
  // documento (`docRef`) y el texto de los bloques, y pasarlas hacia abajo
  // obligaría a mantener dos caminos para lo mismo.
  useEffect(() => {
    const png = () => descargarPng();
    const md = () => descargarMarkdown();
    window.addEventListener('documento:png', png);
    window.addEventListener('documento:markdown', md);
    return () => {
      window.removeEventListener('documento:png', png);
      window.removeEventListener('documento:markdown', md);
    };
  });

  const descargarMarkdown = () => {
    const md = `# ${titulo}\n\n${bloquesAMarkdown(serializar().filter(b => b.tipo !== 'titulo1' || b.texto !== titulo))}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${titulo.replace(/[^a-zA-Z0-9áéíóúñ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'documento'}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const cambiarVisibilidad = async () => {
    if (!docId.current) return;
    const r = await fetch(`/api/publicaciones/ventana/${docId.current}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publico: !publico }),
    });
    if (r.ok) setPublico(p => !p);
  };

  // --------------------------------------------------------------------------
  // Render de un bloque
  // --------------------------------------------------------------------------
  // Una página BLOQUEADA no se edita hasta que se desbloquee (2026-10-06, #29).
  const editable = puedoEditar && !generando && !ajustes.bloqueada;

  // Sin barra flotante (2026-10-02) ya no hay que reservarle hueco abajo.

  /** Lo que el menú ⋮⋮ ofrece además según el bloque (ver `OpcionExtra`). */
  const opcionesExtra = (b: Bloque): OpcionExtra[] => {
    const out: OpcionExtra[] = [];
    if (/^titulo[123]$/.test(b.tipo)) {
      out.push({ icon: ChevronRight, label: 'Título desplegable', activo: !!b.plegable, onClick: () => alternarPlegable(b.id) });
    }
    if (b.tipo === 'boton') {
      out.push({ icon: Settings2, label: 'Configurar el botón', onClick: () => { setMenuAsa(null); setConfigBoton(b.id); } });
    }
    if (b.tipo === 'sincronizado') {
      out.push({ icon: Copy, label: 'Copiar para otra página', onClick: () => copiarSincronizado(b) });
      out.push({ icon: Unlink, label: 'Dejar de sincronizar', onClick: () => dejarDeSincronizar(b.id) });
    } else if (!enSinc[b.id] && b.tipo !== 'subpagina') {
      out.push({ icon: RefreshCw, label: 'Convertir en sincronizado', onClick: () => { setMenuAsa(null); crearSincronizado(null, b.id); } });
    }
    if (esPlegable(b)) {
      out.push({
        icon: ChevronDown, label: 'Abierto al publicar', activo: b.abierto === true,
        onClick: () => cambiarBloque(b.id, { abierto: b.abierto ? undefined : true }),
      });
    }
    // Sangrar también desde el menú: en un teléfono no hay tecla Tab.
    out.push({ icon: ChevronRight, label: 'Meter un nivel', atajo: 'Tab', onClick: () => { setMenuAsa(null); sangrar([b.id], 1); } });
    if (b.nivel) out.push({ icon: ArrowLeft, label: 'Sacar un nivel', atajo: '⇧Tab', onClick: () => { setMenuAsa(null); sangrar([b.id], -1); } });
    return out;
  };

  /** Dónde se inserta lo nuevo: tras el bloque activo, o al final. */
  const anclaInsercion = () => bloqueActivo ?? (bloques.length ? bloques[bloques.length - 1].id : null);

  const renderBloque = (b: Bloque, indice: number) => {
    const texto = textosRef.current[b.id] ?? b.texto ?? '';

    const cuerpo = (() => {
      if (b.tipo === 'separador') return <hr className="border-slate-200 my-2" />;
      if (b.tipo === 'subpagina') return b.entityId ? <EnlaceSubpagina id={b.entityId} tituloGuardado={b.pubTitulo} /> : null;
      // ── MARCADOR Y WEB INSERTADA (2026-10-02) ───────────────────────────
      if (b.tipo === 'marcador' || b.tipo === 'web') {
        if (!b.url) {
          return editable ? (
            <EntradaEnlace tipo={b.tipo === 'web' && videosPendientes.current.has(b.id) ? 'video' : b.tipo}
              onSubir={() => {
                // Subir un vídeo: el hueco se va y entra el de archivo.
                const i = bloques.findIndex(x => x.id === b.id);
                const antes = i > 0 ? bloques[i - 1].id : null;
                videosPendientes.current.delete(b.id);
                setBloques(bs => bs.filter(x => x.id !== b.id));
                insertar(antes, 'medio');
              }}
              onListo={url => {
                // Un enlace de YouTube o Vimeo se ve como reproductor, venga
                // de «Vídeo» o de «Web insertada»: su web entera no se deja
                // meter en un recuadro.
                const yt = idYoutube(url), vm = idVimeo(url);
                videosPendientes.current.delete(b.id);
                if (yt || vm) {
                  setBloques(bs => bs.map(x => x.id === b.id ? { id: x.id, tipo: 'medio', medio: yt ? 'youtube' : 'vimeo', medioId: (yt || vm)! } as Bloque : x));
                  programarGuardado();
                  return;
                }
                setBloques(bs => bs.map(x => x.id === b.id ? { ...x, url, alto: b.tipo === 'web' ? 480 : undefined } : x));
                completarMarcador(b.id, url);
                programarGuardado();
              }} />
          ) : null;
        }
        return b.tipo === 'marcador'
          ? <TarjetaMarcador b={b} cargando={leyendoEnlace.includes(b.id)} />
          : <WebInsertada b={b} onAlto={editable ? alto => { setBloques(bs => bs.map(x => x.id === b.id ? { ...x, alto } : x)); programarGuardado(); } : undefined} />;
      }

      // ── CONTENIDO DE TERCEROS (2026-10-06, #20) ──────────────────────────
      if (b.tipo === 'embed') {
        if (!b.url) {
          return editable ? (
            <EntradaEnlace tipo="embed"
              onListo={url => {
                setBloques(bs => bs.map(x => x.id === b.id ? { ...x, url, alto: embedDe(url)?.alto } : x));
                programarGuardado();
              }} />
          ) : null;
        }
        return <BloqueEmbed b={b} onAlto={editable ? alto => { setBloques(bs => bs.map(x => x.id === b.id ? { ...x, alto } : x)); programarGuardado(); } : undefined} />;
      }

      if (b.tipo === 'pizarra') {
        return b.entityId ? (
          <BloquePizarra id={b.entityId} titulo={b.pubTitulo} vista={b.vista} editable={editable}
            onCambiarVista={v => { setBloques(bs => bs.map(x => (x.id === b.id ? { ...x, vista: v } : x))); programarGuardado(); }} />
        ) : null;
      }

      if (b.tipo === 'imagen') {
        // UNA IMAGEN SE EMBEBE, SALVO QUE LA HAYAS CERRADO (2026-08-22,
        // Eugenio: «si es una imagen por defecto la embebes»). Es lo que ya
        // pasaba; lo nuevo es poder cerrarla a una línea desde los tres
        // puntitos, para una página con veinte capturas donde lo que se lee es
        // el texto.
        if (b.url && b.vista === 'tarjeta') {
          return (
            <button
              type="button"
              onClick={() => abrirLateral({ titulo: b.pie || 'Imagen', destino: b.url || '', crudo: true })}
              className="w-full flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors text-left"
            >
              <img src={b.url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-100" />
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Imagen</span>
                <span className="block text-sm font-bold text-slate-700 truncate">{b.pie || 'Imagen de la página'}</span>
              </span>
            </button>
          );
        }
        // LA IMAGEN COMO EN POWERPOINT (2026-10-06): asas de tamaño, modo
        // recortar, pie editable y el peso con «Comprimir». Ver `ImagenBloque.tsx`.
        return b.url ? (
          editable ? (
            <ImagenEditable b={b}
              onCambio={campos => { setBloques(bs => bs.map(x => (x.id === b.id ? { ...x, ...campos } : x))); programarGuardado(); }}
              onNatural={n => {
                // Medir la imagen no es algo que se deshaga ni que obligue a guardar.
                sinRegistrar.current = true;
                setBloques(bs => bs.map(x => (x.id === b.id ? { ...x, natural: n } : x)));
              }}
              onEditar={() => setImagenEditando(b.id)}
              subirComprimida={async f => {
                const sub = await subirArchivo(f, f.type);
                return sub.error || !sub.url ? { error: sub.error || 'No se ha podido subir.' } : { url: sub.url, bytes: sub.bytes };
              }} />
          ) : (
            <figure>
              <ImagenVista b={b} />
              {b.pie && <figcaption className="text-xs text-slate-400 mt-1 text-center">{b.pie}</figcaption>}
            </figure>
          )
        ) : subidas[b.id] ? (
          <SubiendoImagen vista={subidas[b.id].vista} fraccion={subidas[b.id].fraccion} texto="Subiendo la imagen" />
        ) : editable ? (
          <label className="flex items-center gap-2 px-4 py-6 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 cursor-pointer hover:border-emerald-300 hover:text-emerald-600 transition-colors">
            <ImageIcon className="w-4 h-4" /> Elegir una imagen…
            <input type="file" accept="image/*,.heic,.heif" className="hidden"
              onChange={e => e.target.files?.[0] && subirImagen(b, e.target.files[0])} />
          </label>
        ) : null;
      }

      // Vídeo, audio, PDF y archivos sueltos pegados con ⌘V (2026-08-19) o
      // soltados encima (2026-08-22).
      if (b.tipo === 'medio') {
        const pie = b.pie && <figcaption className="text-xs text-slate-400 mt-1">{b.pie}</figcaption>;
        if (b.medio === 'video') {
          return (
            <figure>
              <video src={b.url} controls playsInline preload="metadata"
                     className="w-full rounded-xl bg-black max-h-[70vh]" />
              {pie}
            </figure>
          );
        }
        if (b.medio === 'youtube' || b.medio === 'vimeo') {
          const src = b.medio === 'youtube'
          // YOUTUBE SIN COOKIES (2026-08-22). `youtube-nocookie.com` es el mismo
          // reproductor sin la cookie de seguimiento: existe exactamente para
          // incrustarse en la web de otro sin dejarle a Google un rastro de quién ha
          // mirado qué. La decisión ya estaba tomada —el Navegador y el Juego lo usaban
          // desde antes— y aquí no se había aplicado: cuatro sitios, dos criterios.
          // Importa además para la ficha de las tiendas, donde hay que DECLARAR con qué
          // terceros se comparte y para qué.
            ? `https://www.youtube-nocookie.com/embed/${b.medioId}`
            : `https://player.vimeo.com/video/${b.medioId}`;
          return (
            <figure>
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe src={src} title={b.pie || 'Vídeo'} className="w-full h-full"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen />
              </div>
              {pie}
            </figure>
          );
        }
        if (b.medio === 'audio') {
          return (
            <figure className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <audio src={b.url} controls preload="none" className="w-full" />
              {pie}
            </figure>
          );
        }
        // ══ EL PDF: TARJETA POR DEFECTO ═══════════════════════════════════
        // (2026-08-22, Eugenio: «si es un pdf por defecto le haces una
        // tarjetita con el nombre y quizás una preview de la primera
        // página»).
        //
        // Antes se metía un visor de 70 vh, que parte el documento en dos: uno
        // deja de leer lo suyo para mirar un adjunto que quizá solo quería
        // tener a mano. La tarjeta dice CUÁL es el archivo —nombre y primera
        // página— y quien quiera leerlo lo abre. Los tres puntitos lo embeben
        // si es eso lo que se quiere.
        if (b.medio === 'pdf') {
          if (b.vista === 'embebido') {
            return (
              <figure>
                <iframe src={b.url} title={b.pie || 'PDF'}
                        className="w-full h-[70vh] rounded-xl border border-slate-200 bg-slate-50" />
                {pie}
              </figure>
            );
          }
          return (
            <button
              type="button"
              onClick={() => abrirLateral({ titulo: b.pie || 'PDF', destino: b.url || '', crudo: true })}
              className="w-full flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 hover:-translate-y-0.5 transition-all text-left"
            >
              {b.url && <PortadaPdf url={b.url} className="shrink-0" />}
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">PDF</span>
                <span className="block text-sm font-bold text-slate-800 truncate">{b.pie || 'Documento'}</span>
                {typeof b.medioBytes === 'number' && (
                  <span className="block text-[10px] text-slate-400">{tamanoLegible(b.medioBytes)}</span>
                )}
              </span>
            </button>
          );
        }
        return (
          <a href={b.url} target="_blank" rel="noreferrer"
             className="flex items-center gap-2.5 px-4 py-3 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors">
            <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-bold text-slate-700 truncate">{b.pie || 'Archivo'}</span>
          </a>
        );
      }

      // ── UNA BASE DE DATOS DENTRO DE LA PÁGINA (fase 10) ──────────────────
      // El bloque `tabla` de siempre es texto plano: nada dentro sabe que 620
      // es un número. Éste es el que lo sustituye — es la MISMA rejilla de la
      // herramienta «Tablas», no una copia, así que lo que se edite aquí es la
      // tabla de verdad y lo que se edite allí se ve aquí.
      //
      // LAS TABLAS DE TEXTO ANTIGUAS SIGUEN FUNCIONANDO. No se migran solas:
      // convertir texto a columnas tipadas exige adivinar el tipo de cada una,
      // y adivinar mal destruiría datos de alguien. Se ofrece convertir, y
      // decide quien escribió la tabla.
      if (b.tipo === 'basedatos') {
        const tablaId = (b as any).tabla_id || bloquesRef.current?.[b.id]?.tabla_id;
        if (!tablaId) {
          return (
            <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-slate-500">Este bloque todavía no apunta a ninguna tabla.</p>
              {editable && (
                <button
                  onClick={async () => {
                    const r = await fetch('/api/bd/tablas', {
                      method: 'POST', credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      // Nace como «Nueva base de datos» (Eugenio, 2026-10-01), no
                      // con el título de la página: dos cosas con el mismo nombre
                      // en la misma pantalla no se distinguen. Se renombra
                      // pinchando en el nombre.
                      body: JSON.stringify({ titulo: 'Nueva base de datos' }),
                    });
                    const j = await r.json();
                    if (j.id) {
                      (b as any).tabla_id = j.id;
                      setBloques(bs => [...bs]);
                      programarGuardado();
                    }
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 h-11 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold">
                  Crear una tabla aquí
                </button>
              )}
            </div>
          );
        }
        return (
          <Rejilla key={`${tablaId}:${versionDatos}`} tablaId={tablaId} editable={editable} alto={520}
            tablasPagina={bloques.filter(x => x.tipo === 'basedatos' && (x as any).tabla_id && (x as any).tabla_id !== tablaId).map(x => (x as any).tabla_id)}
            vista={b.vistaBd || 'galeria'}
            color={b.color}
            tamano={b.tamanoGaleria || 'mediano'}
            visibles={b.propsGaleria}
            onCambiarVisibles={editable ? ids => { b.propsGaleria = ids; setBloques(bs => [...bs]); programarGuardado(); } : undefined}
            onCambiarTamano={editable ? t => { b.tamanoGaleria = t; setBloques(bs => [...bs]); programarGuardado(); } : undefined}
            tamanoTitulo={b.tamanoTitulo || 'mediano'}
            tamanoNombre={b.tamanoNombre}
            onCambiarTamanoNombre={editable ? t => { b.tamanoNombre = t; setBloques(bs => [...bs]); programarGuardado(); } : undefined}
            tituloOculto={!!b.tituloOculto}
            onCambiarTituloOculto={editable ? v => { b.tituloOculto = v || undefined; setBloques(bs => [...bs]); programarGuardado(); } : undefined}
            onCambiarTamanoTitulo={editable ? t => { b.tamanoTitulo = t; setBloques(bs => [...bs]); programarGuardado(); } : undefined}
            onCambiarVista={editable ? v => { b.vistaBd = v; setBloques(bs => [...bs]); programarGuardado(); } : undefined} />
        );
      }

      if (b.tipo === 'tabla') {
        const filas = filasRef.current[b.id] ?? b.filas ?? [['', ''], ['', '']];
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {filas.map((fila, fi) => (
                  <tr key={fi}>
                    {fila.map((celda, ci) => (
                      // `inicial` en vez de pintar el texto como hijo: es lo que
                      // impide que React reescriba la celda mientras escribes y
                      // te mande el cursor al principio. Ver `CeldaEditable`.
                      <CeldaEditable key={`${ci}-${revision}-${revTablas[b.id] || 0}`} inicial={celda} data-celda-de={b.id}
                        className={cn('border border-slate-200 px-2.5 py-1.5 align-top',
                          fi === 0 ? 'bg-slate-50 font-bold text-slate-800' : 'text-slate-600')}
                        contentEditable={editable} suppressContentEditableWarning
                        onInput={e => {
                          const f = filasRef.current[b.id] ?? filas;
                          f[fi][ci] = e.currentTarget.textContent || '';
                          filasRef.current[b.id] = f;
                          programarGuardado();
                        }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && (
              <div className="flex gap-1.5 mt-1">
                <button onClick={() => {
                  const f = filasRef.current[b.id] ?? filas;
                  filasRef.current[b.id] = [...f, f[0].map(() => '')];
                  setBloques(bs => [...bs]); programarGuardado();
                }} className="text-[10px] font-bold text-slate-400 hover:text-emerald-600">+ fila</button>
                <button onClick={() => {
                  const f = filasRef.current[b.id] ?? filas;
                  filasRef.current[b.id] = f.map(fila => [...fila, '']);
                  setBloques(bs => [...bs]); programarGuardado();
                }} className="text-[10px] font-bold text-slate-400 hover:text-emerald-600">+ columna</button>
              </div>
            )}
          </div>
        );
      }

      // Publicación embebida (Fase 2): una ventana enseña su contenido REAL
      // con el mismo renderer que el resto de la app; un lienzo, mapa o
      // proyecto se enseña como tarjeta que lleva a su página.
      if (b.tipo === 'producto') {
        return (
          <button
            type="button"
            onClick={() => b.pubUrl && abrirLateral({ titulo: b.pubTitulo || 'Producto', destino: b.pubUrl })}
            className="w-full text-left flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-300 hover:-translate-y-0.5 transition-all">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center shrink-0">
              <Store className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">Producto</span>
              <span className="block text-sm font-bold text-slate-800 truncate">{b.pubTitulo || 'Producto'}</span>
            </span>
          </button>
        );
      }
      if (b.tipo === 'publicacion') {
        const ventana = b.pubTipo === 'ventana' ? ventanasEmbebidas[b.entityId || ''] : undefined;
        const etiqueta = ({ ventana: b.pubKind || 'ventana', lienzo: 'lienzo', mapa: 'mapa', proyecto: 'carpeta', muro: 'muro' } as any)[b.pubTipo || ''] || 'publicación';
        const interior = (
          <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-emerald-100">
              <Boxes className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700 shrink-0">{etiqueta}</span>
              <span className="text-xs font-black text-slate-800 truncate">{b.pubTitulo}</span>
              {b.pubAutor && <span className="text-[10px] text-slate-400 truncate">· {b.pubAutor}</span>}
            </div>
            {b.pubTipo === 'ventana' ? (
              <div className="px-3.5 py-3 bg-white">
                {!ventana
                  ? <p className="text-xs text-slate-400">Cargando…</p>
                  : <WindowContent kind={ventana.kind} config={ventana.config || {}} variant="node" />}
              </div>
            ) : (
              <div className="px-3.5 py-2.5 bg-white text-xs text-slate-500">
                Una publicación de humanity.wiki — púlsala para explorarla entera.
              </div>
            )}
          </div>
        );
        // ══ SE ABRE AL LADO, NO TE SACA DE LA PÁGINA ══════════════════════
        // (2026-08-22, Eugenio: «cuando estoy en una página y he insertado por
        // ejemplo una publicación de proyecto, y luego le doy a verla, y luego
        // le doy atrás, me tiene que devolver a la página, no atrás de la
        // página de todos los proyectos. Arréglalo, y además haz que se abra en
        // una ventana lateral»).
        //
        // Era un enlace: pulsarlo te llevaba a `/proyectos/:slug`, y desde ahí
        // «atrás» hacía lo que hace esa pantalla —volver al índice de
        // proyectos—, no lo que esperaba quien venía de un documento. La cura
        // no es apañar el historial: es no salir. El panel lateral abre la
        // publicación al lado y «atrás» lo cierra, que es lo que se pidió.
        return b.pubUrl
          ? (
            <button
              type="button"
              onClick={() => abrirLateral({ titulo: b.pubTitulo || 'Publicación', destino: b.pubUrl! })}
              className="block w-full text-left hover:-translate-y-0.5 transition-transform"
            >
              {interior}
            </button>
          )
          : interior;
      }

      // Estilo Typora: SOLO el bloque activo enseña el marcado en crudo para
      // teclear; los demás se ven formateados, y un clic los activa.
      const esActivo = editable && bloqueActivo === b.id;
      const comun = esActivo ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        'data-bloque': b.id,
        onInput: (e: React.FormEvent<HTMLDivElement>) => {
          const t = e.currentTarget.textContent || '';
          textosRef.current[b.id] = t;
          // Cada tecla viaja a Yjs (menos a mitad de una composición: el
          // texto a medias de un acento no se manda; al terminar, sí).
          if (!(e.nativeEvent as InputEvent).isComposing) colabRef.current?.texto(b.id, t);
          if (b.tipo === 'ecuacion') setTexEnVivo({ id: b.id, tex: t });
          // Con la barra abierta, lo que escribes ES el filtro. Si borras la
          // «/» o te vas a otra línea, se cierra sola.
          if (barra && barra.bloque === b.id) {
            if (!t.startsWith('/')) setBarra(null);
            else setBarra(x => x && ({ ...x, texto: t.slice(1), elegido: 0 }));
            return;
          }
          vigilarMencion(b, e.currentTarget);
          autoformato(b, e.currentTarget);
          programarGuardado();
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => alTeclear(b, e),
        onCompositionEnd: (e: React.CompositionEvent<HTMLDivElement>) => colabRef.current?.texto(b.id, e.currentTarget.textContent || ''),
        onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => alPegar(b, e),
        onBlur: () => setBloqueActivo(a => (a === b.id ? null : a)),
        className: cn(CLASES_TEXTO[b.tipo], 'outline-none bg-emerald-50/40 rounded px-1 -mx-1 min-h-[1.4em] whitespace-pre-wrap'),
      } : {
        onClick: editable ? () => { setSeleccion([]); setBloqueActivo(b.id); setFocoId(b.id); } : undefined,
        className: cn(CLASES_TEXTO[b.tipo], 'px-1 -mx-1 min-h-[1.4em]', editable && 'cursor-text hover:bg-slate-50/80 rounded'),
      };

      /** El cuerpo del bloque. Cuando se está editando NO lleva hijos de
       *  React (ver `BloqueEditable`); cuando solo se lee, sí. */
      const cuerpo = (extra?: string) => esActivo
        ? <BloqueEditable key={`${b.id}-edit-${revision}`} inicial={texto} vivo={b.tipo !== 'codigo' && b.tipo !== 'ecuacion'} {...comun} className={cn(comun.className, extra)} />
        : <div key={`${b.id}-ver`} {...comun} className={cn(comun.className, extra)}><Inline texto={texto} /></div>;

      if (b.tipo === 'cita') {
        return <blockquote className="border-l-[3px] border-emerald-300 pl-3">{cuerpo()}</blockquote>;
      }

      // UN TÍTULO PLEGABLE (2026-10-05): el título con su flecha delante; lo
      // de dentro son sus hijos, como en un desplegable.
      if (esPlegable(b) && b.tipo !== 'desplegable') {
        const abierto = !plegados.has(b.id);
        return (
          <div>
            <div className="flex items-start gap-1 -ml-7">
              <div className={b.tipo === 'titulo1' ? 'mt-5' : b.tipo === 'titulo2' ? 'mt-3.5' : 'mt-2'}>
                <FlechaPlegar abierto={abierto} onClick={() => plegar(b.id)} />
              </div>
              {cuerpo('flex-1 min-w-0')}
            </div>
            {editable && abierto && !tieneHijos(b) && (
              <button type="button" onClick={() => meterDentro(b.id)}
                className="mt-0.5 block text-left text-[13px] text-slate-400 hover:text-slate-600">
                Título desplegable vacío. Pulsa para escribir dentro.
              </button>
            )}
          </div>
        );
      }

      // ── EL SINCRONIZADO, ARRIBA DE SU CONTENIDO (2026-10-06) ─────────────
      // Una franja naranja que dice que lo de debajo está en más páginas, en
      // cuáles, y lo que se puede hacer con él.
      if (b.tipo === 'sincronizado') {
        const paginas = sincPaginas[b.sincId || ''] || [];
        const otras = paginas.filter(p => p.id !== docId.current);
        return (
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-orange-700">
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-orange-50 border border-orange-200">
              <RefreshCw className="w-3 h-3" /> Sincronizado
            </span>
            <span className="text-orange-600/80 font-medium">
              {otras.length === 0 ? 'Sólo en esta página por ahora' : `También en ${otras.length === 1 ? '«' + otras[0].titulo + '»' : otras.length + ' páginas más'}`}
            </span>
            {editable && (
              <>
                <button type="button" onClick={e => { e.stopPropagation(); copiarSincronizado(b); }}
                  className="h-6 px-2 rounded-md text-orange-700 hover:bg-orange-100">{tr('Copiar')}</button>
                <button type="button" onClick={e => { e.stopPropagation(); dejarDeSincronizar(b.id); }}
                  className="h-6 px-2 rounded-md text-orange-700 hover:bg-orange-100">Dejar de sincronizar</button>
              </>
            )}
          </div>
        );
      }

      if (b.tipo === 'migas') {
        return <MigasDePan paginaId={docId.current} titulo={titulo} />;
      }

      // ── EL BOTÓN (2026-10-05) ───────────────────────────────────────────
      // Sus hijos son la plantilla (se ven debajo, con un borde punteado).
      // La rueda lo configura; la flecha enseña o esconde la plantilla.
      if (b.tipo === 'boton') {
        const abierto = !plegados.has(b.id);
        const tablasPagina = bloques.filter(x => x.tipo === 'basedatos' && x.tabla_id)
          .map(x => ({ id: x.tabla_id!, titulo: 'Base de datos' }));
        return (
          <div>
            <BotonVista texto={texto} accion={b.boton} ocupado={botonOcupado === b.id}
              onPulsar={() => ejecutarBoton(b)}
              extra={editable && (
                <>
                  <button type="button" onClick={e => { e.stopPropagation(); setConfigBoton(c => (c === b.id ? null : b.id)); }}
                    title="Configurar el botón" aria-label="Configurar el botón"
                    className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <Settings2 className="w-4 h-4" />
                  </button>
                  {(b.boton?.tipo || 'plantilla') !== 'enlace' && (b.boton?.tipo || 'plantilla') !== 'fila' && (
                    <button type="button" onClick={e => { e.stopPropagation(); plegar(b.id); }}
                      className="h-8 px-2 rounded-lg text-[11px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      {abierto ? 'Ocultar plantilla' : 'Ver plantilla'}
                    </button>
                  )}
                </>
              )} />
            {configBoton === b.id && editable && (
              <ConfigBoton texto={texto} accion={b.boton || { tipo: 'plantilla' }} tablas={tablasPagina}
                onCambio={(t, a) => {
                  textosRef.current[b.id] = t;
                  setBloques(bs => bs.map(x => (x.id === b.id ? { ...x, texto: t, boton: a } : x)));
                  programarGuardado();
                }}
                onCerrar={() => setConfigBoton(null)} />
            )}
            {editable && abierto && !tieneHijos(b) && ['plantilla', 'pagina'].includes(b.boton?.tipo || 'plantilla') && (
              <button type="button" onClick={() => meterDentro(b.id)}
                className="ml-7 mt-1 block text-left text-[13px] text-slate-400 hover:text-slate-600">
                Plantilla vacía. Pulsa para escribir dentro lo que {b.boton?.tipo === 'pagina' ? 'llevará cada página nueva' : 'insertará el botón'}.
              </button>
            )}
          </div>
        );
      }

      // ── LOS TRES BLOQUES NUEVOS, EN EL EDITOR (2026-08-23) ─────────────────
      // Se escriben igual que un párrafo: el texto vive en el mismo sitio, así
      // que `cuerpo()` sirve tal cual y no hace falta tocar el guardado ni el
      // manejo del cursor. Lo único que cambia es la caja de alrededor.
      if (b.tipo === 'aviso') {
        const TONOS: Record<string, string> = {
          info: 'bg-sky-50 border-sky-200 text-sky-900',
          ojo: 'bg-amber-50 border-amber-200 text-amber-900',
          idea: 'bg-violet-50 border-violet-200 text-violet-900',
          hecho: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        };
        const tono = TONOS[b.tono || 'info'] || TONOS.info;
        return (
          <div className={cn('rounded-xl border p-3', tono)}>
            {/* El color se elige aquí y no en un menú aparte: son cuatro, y
                verlos puestos es más rápido que leer sus nombres. */}
            {editable && (
              <div className="flex gap-1 mb-2">
                {(['info', 'ojo', 'idea', 'hecho'] as const).map(t => (
                  <button key={t} type="button" title={t}
                    onClick={() => { setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tono: t } : x)); programarGuardado(); }}
                    className={cn('w-6 h-6 rounded-md border-2',
                      TONOS[t].split(' ')[0], TONOS[t].split(' ')[1],
                      (b.tono || 'info') === t ? 'ring-2 ring-slate-400 ring-offset-1' : '')} />
                ))}
              </div>
            )}
            {cuerpo()}
          </div>
        );
      }

      // ── EL DESPLEGABLE, CON SUS BLOQUES DENTRO (2026-10-05) ──────────────
      // Lo de dentro son los bloques que van detrás con más sangría (ver
      // «BLOQUES DENTRO DE BLOQUES»). La flecha lo abre y lo cierra aquí, en
      // el editor; cómo lo encuentra quien lee lo dice `abierto` (menú ⋮⋮).
      if (b.tipo === 'desplegable') {
        return (
          <div>
            <div className="flex items-start gap-1">
              <FlechaPlegar abierto={!plegados.has(b.id)} onClick={() => plegar(b.id)} />
              {cuerpo('flex-1 min-w-0 font-bold')}
            </div>
            {editable && !plegados.has(b.id) && !tieneHijos(b) && (
              <button type="button" onClick={() => meterDentro(b.id)}
                className="ml-7 mt-0.5 block text-left text-[13px] text-slate-400 hover:text-slate-600">
                Desplegable vacío. Pulsa para escribir dentro, o arrastra bloques aquí.
              </button>
            )}
          </div>
        );
      }

      if (b.tipo === 'indice') {
        // El índice no se escribe: se calcula. Aquí se enseña ya calculado,
        // para que quien lo pone vea lo que va a salir en vez de un hueco.
        const titulos = bloques.filter(x =>
          x.tipo === 'titulo1' || x.tipo === 'titulo2' || x.tipo === 'titulo3');
        return (
          <div className="my-1 py-2 pl-3 border-l-2 border-slate-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Índice</p>
            {titulos.length === 0 ? (
              <p className="text-xs text-slate-400">
                Aparecerá aquí en cuanto la página tenga títulos.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {titulos.map((t, i) => (
                  <li key={t.id || i}
                      className={cn('text-sm text-slate-600',
                        t.tipo === 'titulo3' ? 'ml-6' : t.tipo === 'titulo2' ? 'ml-3' : '')}>
                    {(textosRef.current[t.id] ?? t.texto ?? '').trim() || 'Sin título'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }
      if (b.tipo === 'codigo') {
        return <pre className="bg-slate-900 rounded-xl px-4 py-3 overflow-x-auto">{cuerpo()}</pre>;
      }
      // ── ECUACIÓN LaTeX (2026-10-06, #19) ─────────────────────────────────
      // Pulsada, se ve el TeX y debajo la fórmula, que se repinta en cada
      // tecla (`texEnVivo`). Sin pulsar, sólo la fórmula.
      if (b.tipo === 'ecuacion') {
        const activa = editable && bloqueActivo === b.id;
        const tex = activa && texEnVivo?.id === b.id ? texEnVivo.tex : texto;
        return (
          <div className={cn('rounded-xl border px-4 py-3', activa ? 'border-emerald-300 bg-emerald-50/30' : 'border-transparent bg-slate-50/70')}>
            {activa && (
              <div className="mb-2">
                {cuerpo('font-mono text-[13px] text-slate-700 !bg-white border border-slate-200 !px-2 py-1.5')}
                <p className="mt-1 text-[11px] text-slate-400">LaTeX, por ejemplo <code>\frac{'{a}{b}'}</code> o <code>\sum_{'{i=1}'}^n x_i</code>. Intro sigue en un párrafo.</p>
              </div>
            )}
            <div role={editable && !activa ? 'button' : undefined} tabIndex={editable && !activa ? 0 : undefined}
              className={cn('text-center overflow-x-auto text-slate-800 min-h-[1.6em]', editable && !activa && 'cursor-pointer')}
              onClick={editable && !activa ? () => { setSeleccion([]); setBloqueActivo(b.id); setFocoId(b.id); } : undefined}
              onKeyDown={editable && !activa ? e => { if (e.key === 'Enter') { setBloqueActivo(b.id); setFocoId(b.id); } } : undefined}>
              <Formula tex={tex} bloque />
            </div>
          </div>
        );
      }
      if (b.tipo === 'lista' || b.tipo === 'numerada') {
        // El número real se calcula contando los hermanos seguidos del mismo
        // tipo; los hijos de por medio (más sangría) no cortan la cuenta.
        let n = 1;
        if (b.tipo === 'numerada') {
          const nv = b.nivel || 0;
          for (let i = indice - 1; i >= 0; i--) {
            const x = bloques[i], nx = x.nivel || 0;
            if (nx > nv) continue;
            if (nx < nv || x.tipo !== 'numerada') break;
            n++;
          }
        }
        return (
          <div className="flex gap-2">
            <span className="text-slate-400 select-none shrink-0 w-5 text-right leading-relaxed text-[15px]">
              {marcaLista(b.tipo, n, (b.nivel || 0) - (enSinc[b.id]?.capas || 0))}
            </span>
            {cuerpo('flex-1 min-w-0')}
          </div>
        );
      }
      if (b.tipo === 'tarea') {
        return (
          <div className="flex gap-2 items-start">
            <input type="checkbox" checked={!!b.hecho} disabled={!editable}
              onChange={() => { setBloques(bs => bs.map(x => x.id === b.id ? { ...x, hecho: !x.hecho } : x)); programarGuardado(); }}
              className="mt-1.5 accent-emerald-600 shrink-0" />
            {cuerpo(cn('flex-1 min-w-0', b.hecho && 'line-through text-slate-400'))}
          </div>
        );
      }
      return cuerpo();
    })();

    const esBloqueTexto = !['separador', 'imagen', 'tabla', 'publicacion', 'producto', 'medio', 'subpagina', 'pizarra', 'migas', 'boton'].includes(b.tipo);

    return (
      <div
        key={b.id}
        id={`b-${b.id}`}
        data-bloque-caja={b.id}
        className={cn('group/bloque relative rounded transition-shadow',
          destino?.id === b.id && destino.lado === 'arriba' && 'shadow-[0_-3px_0_0_theme(colors.emerald.400)]',
          destino?.id === b.id && destino.lado === 'abajo' && 'shadow-[0_3px_0_0_theme(colors.emerald.400)]',
          destino?.id === b.id && destino.lado === 'izquierda' && 'shadow-[-4px_0_0_0_theme(colors.emerald.400)]',
          destino?.id === b.id && destino.lado === 'derecha' && 'shadow-[4px_0_0_0_theme(colors.emerald.400)]',
          arrastrando === b.id && 'opacity-40',
          b.tipo === 'basedatos' && AIRE_BASE_DATOS,
          b.color && !PINTAN_SU_COLOR.has(b.tipo) && claseColor(b.color),
          b.color && !PINTAN_SU_COLOR.has(b.tipo) && !b.color.startsWith('fondo-') && '[&_[data-bloque]]:![color:inherit] [&_.cursor-text]:![color:inherit]',
          seleccion.includes(b.id) && 'ring-2 ring-emerald-400 bg-emerald-50/60',
          // Dentro de un botón es su plantilla: no es texto de la página.
          enPlantilla.has(b.id) && 'border-l-2 border-dashed border-violet-200 pl-2',
          // Lo de dentro de un sincronizado lleva su raya naranja, como Notion.
          enSinc[b.id] && 'border-l-2 border-orange-300 pl-2')}
        onClickCapture={editable ? e => { clicSeleccion(b, e); } : undefined}
        // La sangría: cada nivel, un paso a la derecha, con sus mandos (el
        // «+» y el asa) detrás, como en Notion.
        style={b.nivel ? { marginLeft: Math.min(b.nivel - (enSinc[b.id]?.capas || 0), 10) * (esMovil ? 18 : 28) } : undefined}
      >
        {/* LOS MANDOS DEL BLOQUE. En escritorio viven FUERA de la columna, a
            56 px por la izquierda, y aparecen al pasar el ratón.

            EN UN TELÉFONO ESO ERA UN EDITOR DE SOLO LECTURA (2026-08-21, B47),
            por dos motivos a la vez, y cada uno bastaba:
             1. `opacity-0` + `group-hover`: un dedo NO hace hover, así que el
                «+» no se enseñaba nunca.
             2. `-left-14`: en 390 px la columna empieza sobre el píxel 40, así
                que 56 px a su izquierda caen FUERA de la pantalla.
            O sea que el único camino para añadir un bloque en medio de una
            página era invisible y además inalcanzable.

            En móvil, por tanto: dentro de la columna y con 44 px de lado. Y
            sin el asa de arrastrar, que es un gesto de ratón: traerla a medias
            sería peor que dejarla en el escritorio.

            SOLO EN EL BLOQUE EN EL QUE ESTÁS, y esto es una corrección sobre
            la marcha: al probarlo con una página de verdad se vio que un «+»
            permanente en cada bloque TAPA EL TEXTO, porque en 390 px no hay
            margen libre donde ponerlo. Es el mismo error que ya cometimos con
            la pastilla del menú encima de las carpetas: un flotante pagando su
            precio a escondidas. Enseñarlo solo en el bloque activo es lo que
            hace el ratón con el hover, traducido a lo que un dedo sí tiene:
            dónde estás tocando. */}
        {editable && (!esMovil || bloqueActivo === b.id) && (
          <div className={cn('absolute flex items-center transition-opacity',
            esMovil
              ? 'right-0 -top-1 z-10'
              : cn('-left-14 top-0.5 z-20 opacity-0 group-hover/bloque:opacity-100', menuAsa === b.id && '!opacity-100'))}>
            <button
              onClick={e => { e.stopPropagation(); setMenuAbierto(m => (m === b.id ? null : b.id)); }}
              title={tr('Añadir un bloque debajo')}
              aria-label={tr('Añadir un bloque debajo')}
              className={cn('rounded-md transition-colors',
                esMovil
                  ? 'w-11 h-11 grid place-items-center text-slate-400 bg-white/85 active:bg-slate-100'
                  : 'p-1 text-slate-300 hover:text-emerald-600 hover:bg-slate-50')}
            >
              <Plus className={esMovil ? 'w-5 h-5' : 'w-4 h-4'} />
            </button>
            {!esMovil && (
              <span
                role="button"
                aria-label={tr('Opciones del bloque')}
                onPointerDown={e => empezarArrastre(b.id, e)}
                title={tr('Arrastra para mover · clic para opciones')}
                className="p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="w-4 h-4" />
              </span>
            )}
            {menuAsa === b.id && (
              <MenuBloque
                tipo={b.tipo} color={b.color} enColumnas={!!b.grupo}
                onBorrar={() => borrarBloque(b.id)}
                onDuplicar={() => duplicar(b.id)}
                onConvertir={t => {
                  // Lo escrito se conserva: sólo cambia la forma.
                  cambiarBloque(b.id, { tipo: t, texto: textosRef.current[b.id] ?? b.texto ?? '' });
                }}
                onColor={c => cambiarBloque(b.id, { color: c })}
                onEnlace={() => copiarEnlace(b.id)}
                onSacarDeColumnas={() => sacarDeColumnas(b.id)}
                onCerrar={() => setMenuAsa(null)}
                extras={opcionesExtra(b)}
              />
            )}
          </div>
        )}
        {/* ══ LOS TRES PUNTITOS DE UN ARCHIVO (2026-08-22) ══════════════════
            Eugenio: «que dé la opción, una vez insertado, con 3 puntitos,
            abrirlo, cerrarlo o embeberlo».

            SOLO EN LOS BLOQUES QUE SON UN ARCHIVO. En un párrafo no hay nada
            que abrir ni que embeber, y un botón que en la mayoría de las filas
            no lleva a ningún sitio enseña a no mirarlos.

            A LA DERECHA, no con el «+» y el asa: aquéllos hablan del sitio del
            bloque en la página (añadir debajo, moverlo); éste habla del
            archivo. Juntarlos sería un solo montón de botones que hacen cosas
            de dos naturalezas. */}
        {editable && (b.tipo === 'medio' || b.tipo === 'imagen') && (
          <div className="absolute right-1 top-1 z-10 opacity-0 group-hover/bloque:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); setMenuMedio(m => (m === b.id ? null : b.id)); }}
              title="Qué hacer con este archivo"
              aria-label="Qué hacer con este archivo"
              className="w-7 h-7 grid place-items-center rounded-lg bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuMedio === b.id && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl p-1 z-30">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setMenuMedio(null);
                    // Abrir es ver el archivo entero SIN salir de la página:
                    // el mismo panel lateral que todo lo demás.
                    abrirLateral({ titulo: b.pie || 'Archivo', destino: b.url || '', crudo: true });
                  }}
                  disabled={!b.url}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors disabled:opacity-40"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> Abrirlo al lado
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation(); setMenuMedio(null);
                    setBloques(bs => bs.map(x => x.id === b.id ? { ...x, vista: 'embebido' } : x));
                    programarGuardado();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Embeberlo
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation(); setMenuMedio(null);
                    setBloques(bs => bs.map(x => x.id === b.id ? { ...x, vista: 'tarjeta' } : x));
                    programarGuardado();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-slate-400" /> Cerrarlo a tarjeta
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={e => {
                    e.stopPropagation(); setMenuMedio(null);
                    setBloques(bs => bs.filter(x => x.id !== b.id));
                    programarGuardado();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 text-left transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Quitarlo de la página
                </button>
              </div>
            )}
          </div>
        )}

        {iaOcupada === b.id && (
          <div className="absolute inset-0 z-20 bg-white/70 rounded flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> La IA está reescribiendo…
            </span>
          </div>
        )}
        {cuerpo}
        {/* LA BARRA «/» — las opciones, filtrándose según escribes. */}
        {barra?.bloque === b.id && (
          <div className="absolute left-0 top-full z-40 mt-1 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1"
            onMouseDown={e => e.preventDefault()}>
            {opcionesBarra.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400 italic">Nada que empiece por «{barra.texto}».</p>
            ) : opcionesBarra.map((t, i) => (
              <button
                key={t.tipo}
                onClick={() => elegirDeLaBarra(b, t.tipo)}
                onMouseEnter={() => setBarra(x => x && ({ ...x, elegido: i }))}
                className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition-colors',
                  i === Math.min(barra.elegido, opcionesBarra.length - 1)
                    ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50')}
              >
                <span className={cn('w-7 h-7 grid place-items-center rounded-lg shrink-0', t.color || 'bg-slate-100 text-slate-500')}><t.icon className="w-4 h-4" /></span>
                <span className="min-w-0"><span className="block text-[13px]">{t.label}</span>{t.desc && <span className="block text-[11px] font-medium text-slate-400 truncate">{t.desc}</span>}</span>
              </button>
            ))}
          </div>
        )}

        {menuAbierto === b.id && (
          // EL SELECTOR NUEVO (2026-10-05): ver `SelectorBloques.tsx`. En el
          // móvil, hoja desde abajo con fondo; en el ordenador, bajo la línea.
          (() => {
            const selector = (
              <SelectorBloques movil={esMovil} opciones={TIPOS_MENU}
                onElegir={t => insertar(b.id, t as TipoMenu)}
                extra={{
                  mejorar: esBloqueTexto ? () => iaMejorar(b) : undefined,
                  eliminar: () => { eliminar(b.id); setMenuAbierto(null); },
                }} />
            );
            return esMovil ? createPortal(
              <div onClick={e => e.stopPropagation()} className="fixed inset-0 z-[60] flex items-end bg-slate-900/30">
                <button aria-label={tr('Cerrar')} className="absolute inset-0" onClick={() => setMenuAbierto(null)} />
                <div className="relative w-full">{selector}</div>
              </div>, document.body) : <Flotante>{selector}</Flotante>;
          })()
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!menuAbierto && !menuDescargar) return;
    const cerrar = () => { setMenuAbierto(null); setMenuDescargar(false); };
    window.addEventListener('click', cerrar);
    return () => window.removeEventListener('click', cerrar);
  }, [menuAbierto, menuDescargar]);

  if (cargando) return <p className="text-sm text-slate-400 text-center py-24">{tr('Abriendo el documento…')}</p>;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{error}</p>
          {/* A donde estabas, no a Explorar: quien llega aquí venía de algún
              sitio y ése es el que quiere recuperar. */}
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/paginas'))}
            className="inline-flex items-center gap-1.5 mt-4 h-11 px-3 text-xs font-black text-emerald-700 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> {tr('Volver atrás')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* SIEMPRE A ANCHO COMPLETO (2026-10-02, Eugenio: «quita la opción de
          que no sea ancho completo»). El mismo ancho que la página publicada. */}
      <div className={cn('mx-auto px-6 sm:px-12 pt-8 pb-32', anchoDePagina(ajustes))}>

        {/* Cabecera: volver, estado de guardado, visibilidad, descargar */}
        <div className="flex items-center gap-2 mb-6 text-xs">
          {/* Se vuelve a PÁGINAS, que es de donde vienes desde que documentos
              y páginas son lo mismo (Eugenio, 2026-08-20). SALVO si esta
              página es un elemento de una base de datos: entonces se vuelve a
              la página que contiene esa base de datos (2026-09-30, Eugenio:
              «me ha llevado a páginas en general […] eso es terrible»). */}
          <Link to={filaDe?.padre ? `/paginas/${filaDe.padre.id}` : user ? '/paginas' : '/explorar'}
            className="inline-flex items-center gap-1 font-bold text-slate-400 hover:text-slate-700 transition-colors min-w-0">
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[12rem]">{filaDe?.padre ? (filaDe.padre.titulo || 'Sin título') : 'Páginas'}</span>
          </Link>
          {generando && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-black ml-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> La IA está escribiendo…
            </span>
          )}
          <span className="ml-auto" />
          {puedoEditar && !generando && (
            <>
              {/* Lo que se está pegando manda sobre el estado de guardado: es
                  lo único que puede tardar de verdad (un vídeo son megas). */}
              {/* DESHACER Y REHACER, también a la vista (2026-10-05): quien no
                  sabe los atajos tiene que poder encontrarlos. */}
              {/* En vivo, las caras salen de la presencia de Yjs (con su cursor);
                  sin conexión en vivo, del aviso de siempre (SSE). */}
              <CarasPresencia
                personas={infoColab?.estado === 'vivo' ? carasDe(personasColab) : presencia.personas}
                yo={infoColab?.estado === 'vivo' ? infoColab.yo?.id ?? null : presencia.yo}
                siguiendo={siguiendo} alSeguir={infoColab?.estado === 'vivo' ? (id => setSiguiendo(s => (s === id ? null : id))) : undefined} />
              <span className="hidden sm:inline-flex items-center">
                <button onClick={deshacer} disabled={!(infoColab && infoColab.estado !== 'abandonado' ? pasosColab.atras : pasos.atras)} title={tr('Deshacer (⌘Z)')} aria-label={tr('Deshacer')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={rehacer} disabled={!(infoColab && infoColab.estado !== 'abandonado' ? pasosColab.adelante : pasos.adelante)} title={tr('Rehacer (⌘⇧Z)')} aria-label={tr('Rehacer')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent">
                  <Redo2 className="w-4 h-4" />
                </button>
              </span>
              <span className={cn('font-bold', subiendo ? 'text-emerald-600' : guardado === 'sí' ? 'text-slate-300' : 'text-amber-600')}>
                {subiendo
                  ? subiendo
                    : guardado === 'sí' ? 'Guardado' : guardado === 'guardando' ? 'Guardando…' : guardado === 'sin conexión' ? tr('sin conexión · se guardará al volver') : 'Cambios sin guardar'}
              </span>
              <button onClick={cambiarVisibilidad}
                className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border transition-colors',
                  publico ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500')}>
                {publico ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {publico ? 'Pública' : 'Privada'}
              </button>
              {/* VER LA PÁGINA PUBLICADA (2026-10-01): en su dominio propio si
                  tiene uno funcionando; si no, en su dirección de Humanity
                  Wiki. En una pestaña nueva del navegador del usuario. */}
              {publico && urlPublicada && (
                <a href={urlPublicada} target="_blank" rel="noopener noreferrer" data-externo
                  title={urlPublicada}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  <ExternalLink className="w-3 h-3" /> {tr('Ver página publicada')}
                </a>
              )}
            </>
          )}
          {/* COMPARTIR, y va antes que descargar a propósito: mandarle la página
              a alguien es lo que se quiere hacer nueve de cada diez veces, y
              hasta hoy no existía el botón — solo un icono de descarga que
              nadie asocia con compartir. */}
          {/* EL MENÚ Y EL PIE DE LA WEB (2026-10-02). Con su nombre y no
              escondido en los ajustes: es lo que convierte una página en una web. */}
          {editable && (
            <button onClick={() => setMenuSitioAbierto(true)} title={tr('Menú y pie de página de la web')}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
              <PanelTop className="w-4 h-4" /> {tr('Menú y pie')}
            </button>
          )}
          {/* LA CONSOLA (2026-10-08): la cadena de valor del negocio, privada. Sólo a quien gestiona la página
              y sólo en humanity.wiki (el servidor lo exige; aquí sólo se esconde el botón). */}
          {puedoGestionar && !filaDe?.fila_id && ['humanity.wiki', 'localhost', '127.0.0.1'].includes(window.location.hostname) && (
            <button onClick={() => setConsolaAbierta(true)} title="Consola: cómo va el negocio" aria-label="Consola: cómo va el negocio"
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
              <CircleDashed className="w-4 h-4" /> <span className="hidden sm:inline">Consola</span>
            </button>
          )}
          {editable && (
            <button onClick={() => setMenuSitioAbierto(true)} title={tr('Menú y pie de página de la web')} aria-label={tr('Menú y pie de página de la web')}
              className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              <PanelTop className="w-4 h-4" />
            </button>
          )}
          {/* BUSCAR Y ATAJOS, para quien no sabe las teclas (2026-10-06). */}
          <button onClick={() => setBuscando(b => ({ q: b?.q || '', senal: (b?.senal || 0) + 1 }))} title="Buscar en la página (⌘F)" aria-label="Buscar en la página"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button onClick={() => setAtajosAbiertos(true)} title="Atajos de teclado (?)" aria-label="Atajos de teclado"
            className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
            <Keyboard className="w-4 h-4" />
          </button>
          {puedoEditar && !generando && (
            <button onClick={() => { setAjustes(a => ({ ...a, bloqueada: a.bloqueada ? undefined : true })); programarGuardado(); }}
              title={ajustes.bloqueada ? 'Desbloquear la página' : 'Bloquear la página'} aria-label={ajustes.bloqueada ? 'Desbloquear la página' : 'Bloquear la página'}
              className={cn('p-1.5 rounded-lg transition-colors', ajustes.bloqueada ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50')}>
              {ajustes.bloqueada ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}
          {editable && (
            <button onClick={() => setAjustesAbierto(true)} title={tr('Ajustes de la página')} aria-label={tr('Ajustes de la página')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
          {/* FAVORITA (#14): la estrella marca la página para el menú de la izquierda. */}
          {!esNuevo && id && <BotonFavorito tipo="pagina" id={id} titulo={titulo} />}
          <button onClick={() => setCompartirAbierto(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">
            <Share2 className="w-3.5 h-3.5" /> {tr('Compartir')}
          </button>

          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setMenuDescargar(m => !m); }} title={tr('Descargar')}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
            {menuDescargar && (
              <div className="absolute right-0 top-full z-40 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-44"
                onClick={e => e.stopPropagation()}>
                {[
                  { label: 'Markdown (.md)', accion: () => { setMenuDescargar(false); descargarMarkdown(); } },
                  { label: 'Word (.docx)', accion: () => { setMenuDescargar(false); window.open(`/api/documentos/${docId.current}/docx`, '_blank'); } },
                  { label: 'PDF (.pdf)', accion: () => { setMenuDescargar(false); window.open(`/api/documentos/${docId.current}/pdf`, '_blank'); } },
                  { label: 'Imagen (.png)', accion: descargarPng },
                ].map(o => (
                  <button key={o.label} onClick={o.accion}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors">
                    <Download className="w-3 h-3 text-slate-400" /> {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* LOS TRES PUNTITOS DE UNA ENTRADA DE BASE DE DATOS (2026-10-08). */}
          {editable && filaDe?.fila_id && filaDe.tabla_id && id && (
            <MenuEntradaPagina filaId={filaDe.fila_id} tablaId={filaDe.tabla_id} paginaId={id}
              nombre={titulo} tablaTitulo={filaDe.tabla_titulo} padre={filaDe.padre} />
          )}
        </div>

        <div
          ref={docRef}
          onDragOver={e => { if (!arrastrando && traeArchivos(e.dataTransfer)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setArchivoEncima(true); } }}
          onDragLeave={e => { if (e.currentTarget === e.target) setArchivoEncima(false); }}
          onDrop={alSoltarArchivos}
          className={cn('relative bg-white rounded-2xl transition-colors', clasesDePagina(ajustes),
            archivoEncima && 'ring-2 ring-emerald-400 ring-offset-4')}
        >
        {infoColab?.estado === 'vivo' && <CursoresAjenos personas={personasColab} contenedor={docRef} colab={colabRef} />}
        {/* PÁGINA BLOQUEADA (2026-10-06, #29): se lee pero no se escribe. */}
        {ajustes.bloqueada && (
          <div role="status" data-pagina-bloqueada className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">Esta página está bloqueada: nadie la edita hasta que se desbloquee.</span>
            {puedoEditar && (
              <button type="button" onClick={() => { setAjustes(a => ({ ...a, bloqueada: undefined })); programarGuardado(); }}
                className="h-8 px-2.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-100">Desbloquear</button>
            )}
          </div>
        )}
        {/* SUÉLTALO AQUÍ. Solo mientras hay algo volando encima. */}
        {archivoEncima && (
          <p className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-dashed border-emerald-300 text-xs font-bold text-emerald-700">
            {tr('Suelta el archivo y lo añado al final de la página.')}
          </p>
        )}
        {compartirAbierto && (
          <DialogoCompartir
            paginaId={docId.current}
            titulo={titulo}
            publicoInicial={publico}
            onCerrar={() => setCompartirAbierto(false)}
            onCambio={p => setPublico(p)}
          />
        )}

        {/* Miga de pan: la página madre y la base de datos donde vive ésta. */}
        {filaDe && (
          <nav className="flex items-center flex-wrap gap-1 mb-2 text-xs font-bold text-slate-400">
            {filaDe.padre && (
              <>
                <Link to={`/paginas/${filaDe.padre.id}`} className="hover:text-slate-700 truncate max-w-[14rem]">
                  {filaDe.padre.titulo || 'Sin título'}
                </Link>
                {filaDe.tabla_titulo && <span aria-hidden>/</span>}
              </>
            )}
            {filaDe.tabla_titulo && <span className="truncate max-w-[14rem]">{filaDe.tabla_titulo}</span>}
          </nav>
        )}

        {/* ══ LA CABECERA: IMAGEN, ICONO Y TÍTULO (2026-09-30) ══════════════
            Eugenio eligió que la imagen pueda ir arriba, debajo o a un lado
            del título, con una barra para el tamaño. La misma pieza pinta la
            página publicada. Ver `CabeceraPagina.tsx`. */}
        <LayoutCabecera
          cabecera={ajustes.cabecera}
          imagen={subidas.portada ? (
            <SubiendoImagen vista={subidas.portada.vista} fraccion={subidas.portada.fraccion} texto="Subiendo la portada" />
          ) : portada ? (
            <div className="group/portada relative w-fit max-w-full">
              <img src={portada} alt="" className="w-full h-56 object-cover rounded-2xl" />
              {editable && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/portada:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button onClick={() => setEligiendoPortada(true)}
                    className="px-2 py-1 bg-white/90 rounded-lg text-[10px] font-black text-slate-600">
                    {tr('Cambiar')}
                  </button>
                  <button onClick={() => { setPortada(null); programarGuardado(); }}
                    className="px-2 py-1 bg-white/90 rounded-lg text-[10px] font-black text-slate-600">
                    {tr('Quitar')}
                  </button>
                </div>
              )}
            </div>
          ) : null}
          cuerpo={<>
            {editable && (
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {!icono && !eligiendoIcono && (
                  <button onClick={() => setEligiendoIcono(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors">
                    <Smile className="w-3.5 h-3.5" /> {tr('Añadir icono')}
                  </button>
                )}
                {/* EL ICONO: UN EMOJI, O UNA IMAGEN PEGADA, ARRASTRADA O SUBIDA
                    (2026-10-02). Antes era una fila de emojis y un botón
                    pequeño «Imagen»; ahora es el mismo diálogo que la portada. */}
                {eligiendoIcono && (
                  <SoltarImagen
                    titulo={icono ? 'Cambiar el icono' : 'Añadir icono'}
                    onCerrar={() => setEligiendoIcono(false)}
                    onArchivo={async f => {
                      // Un icono se ve a 128 px como mucho: 512 sobra incluso
                      // en pantallas retina, y pesa diez veces menos.
                      const sub = await subirArchivo(f, undefined, undefined, { maxLado: 512 });
                      if (!sub.url) return sub.error || 'No se ha podido subir la imagen.';
                      setIcono(sub.url); programarGuardado();
                    }}
                    pie={icono ? (
                      <button onClick={() => { setIcono(null); setEligiendoIcono(false); programarGuardado(); }}
                        className="w-full text-center text-xs font-bold text-slate-400 hover:text-rose-500">{tr('Quitar el icono')}</button>
                    ) : null}
                  >
                    <div>
                      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Un emoji</p>
                      <div className="flex flex-wrap gap-1">
                        {EMOJIS_ICONO.map(e => (
                          <button key={e} onClick={() => { setIcono(e); setEligiendoIcono(false); programarGuardado(); }}
                            aria-label={`Usar ${e} como icono`}
                            className="grid h-10 w-10 place-items-center rounded-xl text-xl hover:bg-slate-100">{e}</button>
                        ))}
                      </div>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">O una imagen tuya</p>
                    </div>
                  </SoltarImagen>
                )}
                {eligiendoPortada && (
                  <SoltarImagen
                    titulo={portada ? 'Cambiar la portada' : 'Añadir portada'}
                    onCerrar={() => setEligiendoPortada(false)}
                    // Se cierra en cuanto hay archivo: la portada enseña su
                    // propia barra de subida en la página, con la foto ya puesta.
                    onArchivo={f => { subirPortada(f); }}
                  />
                )}
                {!portada && !eligiendoIcono && (
                  <button onClick={() => setEligiendoPortada(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors">
                    <ImageIcon className="w-3.5 h-3.5" /> {tr('Añadir portada')}
                  </button>
                )}
                {ajustes.subtitulo === undefined && !eligiendoIcono && (
                  <button onClick={() => { setAjustes(a => ({ ...a, subtitulo: '' })); setFocoDescripcion(true); }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors">
                    <AlignLeft className="w-3.5 h-3.5" /> {tr('Añadir descripción')}
                  </button>
                )}
                {(portada || icono || ajustes.subtitulo !== undefined) && !eligiendoIcono && (
                  <button onClick={() => setDisenoAbierto(v => !v)} aria-expanded={disenoAbierto}
                    className={cn('inline-flex items-center gap-1 text-[11px] font-bold transition-colors',
                      disenoAbierto ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500')}>
                    <LayoutTemplate className="w-3.5 h-3.5" /> Diseño de la cabecera
                  </button>
                )}
              </div>
            )}
            {/* Icono al lado del título por defecto; título y descripción
                van juntos. Ver `FilaTitulo`. */}
            <FilaTitulo cabecera={ajustes.cabecera} icono={icono ? (
              <div className="relative inline-block">
                <button
                  onClick={() => editable && setEligiendoIcono(v => !v)}
                  className={cn('block', editable && 'hover:scale-105 transition-transform')}
                  title={editable ? 'Cambiar icono' : undefined}
                >
                  {/* El icono puede ser un emoji o una IMAGEN tuya (Eugenio,
                      2026-08-20). Se distinguen mirando el valor. */}
                  <IconoElemento valor={icono} tamano={ladoIcono(ajustes.cabecera, esMovil)} className="rounded-xl" />
                </button>
              </div>
            ) : null}>
        {/* Título del documento */}
        {editable ? (
          <TituloEditable
            valor={titulo}
            onCambiar={v => { setTitulo(v); colabRef.current?.titulo(v); programarGuardado(); }}
          />
        ) : (
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-1 break-words">{titulo}</h1>
        )}
        {/* LA DESCRIPCIÓN, PEGADA AL TÍTULO (2026-09-30). Va dentro de la
            cabecera, así que se mueve con él cuando la imagen cambia de
            sitio: título y descripción son un solo bloque. */}
        {ajustes.subtitulo !== undefined && (editable ? (
          <DescripcionEditable
            valor={ajustes.subtitulo}
            letra={letraDescripcion(ajustes.cabecera, esMovil)}
            enfocar={focoDescripcion}
            onEnfocado={() => setFocoDescripcion(false)}
            onCambiar={v => { setAjustes(a => ({ ...a, subtitulo: v })); programarGuardado(); }}
            // Se quita BORRÁNDOLA (Eugenio, 2026-10-01: «sin botón»): vacía al
            // salir, desaparece y vuelve el «Añadir descripción».
            onVaciar={() => { setAjustes(a => ({ ...a, subtitulo: undefined, subtituloOculto: undefined })); programarGuardado(); }}
          />
        ) : ajustes.subtitulo ? (
          <p className="mt-2 text-slate-500 leading-snug whitespace-pre-line" style={{ fontSize: letraDescripcion(ajustes.cabecera, esMovil) }}>
            <Inline texto={ajustes.subtitulo} />
          </p>
        ) : null)}
            </FilaTitulo>
        {/* EL AUTOR, OCULTO POR DEFECTO (2026-09-30). Quien escribe lo ve
            atenuado, con la opción de mostrarlo al pasar el ratón; quien lee
            sólo lo ve si el autor lo ha decidido. */}
        {autor && (editable ? (
          <p className="group flex items-center gap-2 text-xs mb-6">
            <span className={ajustes.mostrarAutor ? 'text-slate-400' : 'text-slate-300 line-through decoration-slate-200'}>de {autor}</span>
            <button onClick={() => { setAjustes(a => ({ ...a, mostrarAutor: !a.mostrarAutor })); programarGuardado(); }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
              {ajustes.mostrarAutor ? <><EyeOff className="w-3 h-3" /> Ocultar nombre</> : <><Eye className="w-3 h-3" /> Mostrar nombre</>}
            </button>
            {!ajustes.mostrarAutor && <span className="text-[11px] text-slate-300 group-hover:hidden">oculto al publicar</span>}
            {/* EL TÍTULO TAMBIÉN SE PUEDE OCULTAR AL PÚBLICO (2026-10-02). Aquí,
                junto al autor, porque es la misma decisión: qué se ve arriba. */}
            <button onClick={() => { setAjustes(a => ({ ...a, ocultarTitulo: a.ocultarTitulo ? undefined : true })); programarGuardado(); }}
              className={cn('inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-bold hover:text-slate-700 hover:bg-slate-50 transition-opacity',
                ajustes.ocultarTitulo ? 'text-amber-600' : 'text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100')}>
              {ajustes.ocultarTitulo ? <><EyeOff className="w-3 h-3" /> Título oculto al publicar</> : <><EyeOff className="w-3 h-3" /> Ocultar título</>}
            </button>
          </p>
        ) : ajustes.mostrarAutor ? (
          <p className="text-xs text-slate-400 mb-6">de {autor}</p>
        ) : <div className="mb-6" />)}

          </>}
        />

        {/* Las propiedades del elemento, si esta página es una fila de una
            base de datos: ahí se liga el proyecto a su área. */}
        {filaDe?.fila_id && filaDe.tabla_id && (
          <PropiedadesFila tablaId={filaDe.tabla_id} filaId={filaDe.fila_id} editable={editable} />
        )}

        {editable && disenoAbierto && (portada || icono || ajustes.subtitulo !== undefined) && (
          <div className="mb-6">
            <MandosCabecera cabecera={ajustes.cabecera} hayImagen={!!portada} hayIcono={!!icono}
              hayDescripcion={ajustes.subtitulo !== undefined}
              onCambio={cab => { setAjustes(a => ({ ...a, cabecera: cab })); programarGuardado(); }} />
          </div>
        )}

        {/* EL BOTÓN DE LA IA, FLOTANDO (2026-10-02, Eugenio: «un botón flotante
            en la herramienta de creación de páginas que abra el chat con la IA,
            y que se le pueda pedir que agregue contenido a la página»). Abre el
            mismo chat de siempre —con su voz y sus adjuntos—; lo que lo hace
            distinto es que el chat ya sabe qué página es (ver
            `humanity:pagina-abierta` arriba). Sólo para quien puede editarla:
            a quien sólo lee, la IA no podría añadirle nada. */}
        {editable && (
          <button onClick={() => window.dispatchEvent(new Event('ai:abrir'))}
            title="Pedirle a la IA que añada contenido a esta página" aria-label="Abrir la IA"
            className="fixed right-4 bottom-24 sm:right-6 sm:bottom-8 z-[9991] inline-flex items-center gap-2 h-12 pl-3.5 pr-4 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-colors">
            <Sparkles className="w-5 h-5" /> <span className="hidden sm:inline">{tr('IA')}</span>
          </button>
        )}
        {buscando && <BuscarEnPagina raiz={docRef} inicial={buscando.q} senal={buscando.senal} onCerrar={() => setBuscando(null)} />}
        {atajosAbiertos && <AtajosAyuda onCerrar={() => setAtajosAbiertos(false)} />}
        {menc && <MencionesMenu x={menc.x} y={menc.y} tipo={menc.tipo} q={menc.q} onElegir={aplicarMencion} onCerrar={cerrarMenc} />}
        {/* ¿QUÉ HAGO CON ESTE ENLACE? (2026-10-02, como Notion) */}
        {menuEnlace && (
          <div data-menu-enlace role="menu" aria-label="Qué hacer con el enlace"
            style={{ left: Math.max(8, menuEnlace.x), top: Math.min(menuEnlace.y, window.innerHeight - 200) }}
            className="fixed z-[9995] w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-1">
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Pegar como</p>
            {[
              { icono: Link2, nombre: 'Enlace', ayuda: 'Se queda en el texto, como un enlace' },
              { icono: Bookmark, nombre: 'Marcador', ayuda: 'Tarjeta con imagen, título y descripción' },
              menuEnlace.video
                ? { icono: Play, nombre: 'Insertar el vídeo', ayuda: 'Se reproduce dentro de la página' }
                : menuEnlace.embed
                ? { icono: PanelTop, nombre: `Insertar ${menuEnlace.embed.proveedor}`, ayuda: 'Se ve dentro de la página' }
                : {
                  icono: Globe, nombre: 'Insertar la web',
                  ayuda: menuEnlace.insertable === null ? 'Comprobando si se deja…'
                    : menuEnlace.insertable ? 'La web se ve dentro de la página' : 'Esta web no deja que la metan en otra',
                },
            ].map((op, i) => {
              const bloqueada = i === 2 && menuEnlace.insertable === false;
              return (
                <button key={op.nombre} type="button" role="menuitem" disabled={bloqueada}
                  onMouseEnter={() => setMenuEnlace(m => m && ({ ...m, elegido: i }))}
                  onClick={() => elegirEnlace(i)}
                  className={cn('w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left',
                    menuEnlace.elegido === i && !bloqueada ? 'bg-slate-100' : '', bloqueada && 'opacity-50 cursor-not-allowed')}>
                  <span className="w-8 h-8 grid place-items-center rounded-md border border-slate-200 bg-white shrink-0 text-slate-600">
                    {i === 2 && menuEnlace.insertable === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <op.icono className="w-4 h-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800">{op.nombre}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{op.ayuda}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {consolaAbierta && id && <ConsolaCadena paginaId={id} titulo={titulo} onCerrar={() => setConsolaAbierta(false)} />}
        {menuSitioAbierto && (
          <CreadorMenu sitio={ajustes.sitio} titulo={titulo} icono={icono}
            opciones={{
              secciones: bloques.filter(b => ['titulo1', 'titulo2', 'titulo3'].includes(b.tipo) && (b as any).texto?.trim())
                .map(b => ({ id: b.id, titulo: String((b as any).texto).replace(/[*_`#]/g, '').trim().slice(0, 60) })),
              bases: bloques.filter(b => b.tipo === 'basedatos' && (b as any).tabla_id)
                .map(b => ({ bloque: b.id, tabla: String((b as any).tabla_id) })),
              paginas: bloques.filter(b => b.tipo === 'subpagina' && (b as any).entityId)
                .map(b => ({ id: (b as any).entityId, titulo: (b as any).pubTitulo || 'Subpágina' })),
            }}
            onCambio={sitio => { setAjustes(a => ({ ...a, sitio })); programarGuardado(); }}
            onCerrar={() => setMenuSitioAbierto(false)} />
        )}
        {ajustesAbierto && (
          <AjustesPagina ajustes={ajustes} portada={portada} titulo={titulo}
            resumen={contarPagina(aArbol(bloques), textosRef.current)}
            onCambio={a => { setAjustes(a); programarGuardado(); }}
            onCerrar={() => setAjustesAbierto(false)} />
        )}

        {/* Los bloques */}
        <div className={cn('space-y-2', editable && 'pl-0')}>
          {/* Una fila es un bloque suelto o varios en columnas. En un
              teléfono las columnas se apilan: 390 px no caben dos. */}
          {enFilas(visibles).map(fila => fila.length === 1
            ? renderBloque(fila[0], bloques.indexOf(fila[0]))
            : (
              <div key={`fila-${fila[0].grupo}`} className="flex flex-col sm:flex-row gap-2 sm:gap-14">
                {fila.map(x => (
                  <div key={`col-${x.id}`} className="sm:flex-1 min-w-0">{renderBloque(x, bloques.indexOf(x))}</div>
                ))}
              </div>
            ))}
        </div>
        </div>

        {generando && (
          <p className="inline-flex items-center gap-2 mt-6 text-xs font-bold text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Escribiendo…
          </p>
        )}
        <div ref={finalRef} />

        {/* Añadir al final + continuar con IA, siempre visibles en edición */}
        {editable && (
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={e => { e.stopPropagation(); alFinal.current = true; setMenuAbierto(bloques[bloques.length - 1]?.id || null); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {tr('Añadir un bloque')}
            </button>
            <button
              onClick={iaContinuar}
              disabled={iaOcupada === 'continuar'}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-600 disabled:opacity-60 transition-colors"
            >
              {iaOcupada === 'continuar'
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> La IA está escribiendo…</>
                : <><PenLine className="w-3.5 h-3.5" /> Continuar con IA</>}
            </button>
            <span className="text-[10px] text-slate-300 hidden sm:inline">
              Ctrl+clic marca varios bloques · Shift+clic marca un tramo
            </span>
          </div>
        )}

        {/* LOS ARCHIVOS DE LA PÁGINA (2026-08-21). Van al pie y no como un
            bloque más del texto: un adjunto no es una frase dentro del
            documento, es algo que viene CON el documento —el informe original,
            la hoja de datos— y se quiere encontrar siempre en el mismo sitio,
            no buscándolo entre los párrafos.

            Solo si la página ya existe. Una página que aún no se ha guardado no
            tiene de qué colgar nada, y ofrecer el botón sería prometer algo que
            fallaría al pulsarlo. */}
        {id && !esNuevo && (
          <div className="mt-10">
            {/* Ya no está siempre (2026-09-30, Eugenio: «elimina lo de archivos
                adjuntos que está por defecto; se sube desde el +»). Sólo se
                enseña en las páginas que ya tenían archivos, para no
                esconderle a nadie lo que subió. */}
            <Adjuntos contenedor="pagina_id" id={id} puedeEditar={puedoEditar} soloSiHay />
          </div>
        )}
        {/* Las páginas que nombran o enlazan a ésta (2026-10-06, #6). */}
        {id && !esNuevo && !generando && <EnlazanAqui key={`ea-${id}`} paginaId={id} />}
      </div>

      <input ref={archivoRef} type="file" multiple className="hidden" onChange={e => subirDesdeMenu(e.target.files)} />

      {/* Lo que se arrastra, siguiendo al puntero. */}
      {arrastre && (
        <div className="fixed z-[90] pointer-events-none px-2.5 py-1 rounded-lg bg-slate-900/85 text-white text-[11px] font-bold shadow-lg"
          style={{ left: arrastre.x + 14, top: arrastre.y + 10 }}>
          {destino?.lado === 'izquierda' || destino?.lado === 'derecha' ? 'Soltar al lado' : 'Mover bloque'}
        </div>
      )}

      {fallo && (
        <div role="alert" className="fixed top-20 left-1/2 -translate-x-1/2 z-[85] flex items-center gap-3 pl-4 pr-2 min-h-11 max-w-[calc(100vw-2rem)] rounded-xl bg-rose-600 text-white text-xs font-bold shadow-2xl">
          <span className="py-2">{fallo}</span>
          <button onClick={() => fallar(null)} aria-label={tr('Cerrar el aviso')} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* «Bloque borrado · Deshacer», como en Notion. */}
      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 pl-4 pr-2 h-11 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl">
          <span>{aviso}</span>
          {pasos.atras > 0 && !aviso.startsWith('Enlace') && !aviso.startsWith('http') && (
            <button onClick={deshacer} className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20">{tr('Deshacer')} <span className="text-white/50">⌘Z</span></button>
          )}
        </div>
      )}

      {/* Barra flotante de la selección múltiple */}
      {seleccion.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-2.5">
          <span className="text-xs font-black">{seleccion.length} {seleccion.length === 1 ? 'bloque' : 'bloques'}</span>
          <button
            onClick={eliminarSeleccion}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-black transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> {tr('Eliminar')}
          </button>
          <button
            onClick={() => setSeleccion([])}
            title="Deshacer la selección (Esc)"
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor de imágenes sobre un bloque imagen */}
      {imagenEditando && (() => {
        const b = bloques.find(x => x.id === imagenEditando);
        return b?.url ? (
          <EditorImagen
            src={b.url}
            onGuardar={url => {
              // Es otra imagen: su recorte, sus medidas y su peso ya no valen.
              setBloques(bs => bs.map(x => x.id === imagenEditando ? { ...x, url, recorte: undefined, natural: undefined, medioBytes: undefined, relacion: undefined } : x));
              setImagenEditando(null);
              programarGuardado();
            }}
            onCerrar={() => setImagenEditando(null)}
          />
        ) : null;
      })()}

      {creandoProducto && (
        <CrearProducto
          onCancelar={() => setCreandoProducto(false)}
          onCreado={p => {
            setCreandoProducto(false);
            // Se inserta en el mismo bloque que estaba esperando, para que
            // crear y colocar sean un solo gesto y no dos pantallas.
            embeber({ id: p.id, tipo: 'producto', titulo: p.nombre, kind: 'producto' });
          }}
        />
      )}

      {/* Buscador de publicaciones para embeber (Fase 2) */}
      {buscadorPub !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center pt-24 px-5"
          onClick={() => setBuscadorPub(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus value={busquedaPub} onChange={e => setBusquedaPub(e.target.value)}
                placeholder={buscaProducto ? 'Busca el producto que quieres insertar…' : soloMapas ? 'Busca el mapa que quieres insertar…' : 'Busca la publicación que quieres insertar…'}
                className="flex-1 text-sm outline-none"
              />
              <button onClick={() => setBuscadorPub(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* CREAR UNO NUEVO SIN SALIR DE AQUÍ (fase 2 de Comercio).
                Antes esto era un buscador que para casi todo el mundo no
                encontraba nada, porque no había ninguna pantalla donde crear
                productos. Buscar algo que no existe y no poder crearlo es un
                callejón sin salida. */}
            {buscaProducto && (
              <button
                onClick={() => setCreandoProducto(true)}
                className="w-full flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 hover:bg-emerald-50 text-left transition-colors">
                <span className="w-7 h-7 rounded-lg bg-slate-900 grid place-items-center shrink-0">
                  <Plus className="w-4 h-4 text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black text-slate-800">Crear un producto nuevo</span>
                  <span className="block text-[10px] text-slate-400">Nombre y precio bastan; lo demás se rellena luego</span>
                </span>
              </button>
            )}
            <div className="max-h-80 overflow-y-auto p-1.5">
              {!resultadosPub.length ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  {soloMapas && !busquedaPub ? <>Todavía no hay mapas que insertar. <Link to="/mapas" className="font-bold text-emerald-600 hover:underline">Crea uno en Mapas</Link>.</>
                    : busquedaPub ? 'Nada con ese nombre.'
                    : buscaProducto ? 'Busca entre tus productos, o crea uno arriba.'
                    : 'Escribe para buscar entre las publicaciones.'}
                </p>
              ) : resultadosPub.map(p => (
                <button
                  key={`${p.tipo}-${p.id}`}
                  onClick={() => embeber(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-left transition-colors"
                >
                  <Boxes className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-slate-800 truncate">{p.titulo || p.title}</span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {(p.kind || p.tipo)}{p.autor_nombre ? ` · ${p.autor_nombre}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LA BARRA FLOTANTE «AÑADIR» SE HA QUITADO (2026-10-02, Eugenio:
          «elimina el menú flotante de la parte inferior donde pone añadir,
          para no ocupar espacio en la pantalla»). Añadir sigue a mano por tres
          sitios: el «+» de cada línea, la barra «/» y «Añadir un bloque» al
          final de la página. */}
    </div>
  );
}

/**
 * EL TEXTO DEL BLOQUE QUE ESTÁS ESCRIBIENDO (arreglado 2026-08-20, Eugenio:
 * «a veces escribe al revés, de derecha a izquierda, y el borrado no borra
 * bien»).
 *
 * QUÉ PASABA: el bloque activo es `contentEditable` y además React le pintaba
 * su texto como hijo. Al teclear, cualquier re-render —y hay uno por tecla,
 * porque el autoguardado y el autoformato tocan estado— hacía que React
 * REESCRIBIERA ese nodo de texto. Reescribir el nodo manda el cursor al
 * principio, así que la siguiente letra entraba delante de la anterior: el
 * texto salía del revés. Y Retroceso borraba donde estaba el cursor —o sea,
 * al principio— en vez de donde tú mirabas.
 *
 * LA REGLA: mientras un bloque se está editando, EL DUEÑO DEL TEXTO ES EL DOM,
 * no React. Aquí el HTML se fija una sola vez al montar (`useRef`, no una
 * prop): como el valor no cambia entre renders, React no vuelve a tocar el
 * contenido, y el cursor se queda donde lo dejaste. Lo que escribes se lee en
 * `onInput` y se guarda en `textosRef`, que es de donde sale todo lo demás.
 *
 * El componente se monta de nuevo cada vez que activas otro bloque, así que
 * siempre arranca con el texto correcto.
 */
function BloqueEditable({ inicial, vivo = true, onInput, ...props }: { inicial: string; vivo?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const pintado = useRef<string | null>(null);
  // El texto se pone UNA vez, al montar, y a mano. A partir de ahí React ni lo
  // sabe ni le importa: para él este div está vacío. En `useLayoutEffect`
  // para que esté puesto antes de que la página coloque el cursor dentro.
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = inicial;
    // Con el formato a la vista desde el primer momento (`marcadoVivo.ts`).
    if (vivo) pintado.current = repintar(ref.current, null);
    // Sin `inicial` en las dependencias A PROPÓSITO: si volviera a entrar
    // mientras escribes, te machacaría lo tecleado y te movería el cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} {...props}
      onInput={e => {
        onInput?.(e);
        // LA NEGRITA, AL MOMENTO (2026-10-02). Después de que el editor haya
        // leído el texto, y nunca a mitad de una tilde (`isComposing`): partir
        // una composición deja la letra a medias.
        if (vivo && ref.current && !(e.nativeEvent as InputEvent).isComposing) pintado.current = repintar(ref.current, pintado.current);
      }}
      onCompositionEnd={e => { props.onCompositionEnd?.(e); if (vivo && ref.current) pintado.current = repintar(ref.current, pintado.current); }} />
  );
}

/**
 * LA MISMA CURA, PARA UNA CELDA DE TABLA (2026-08-21, Eugenio: «la tabla del
 * creador de páginas, cuando escribes dentro funciona mal, y escribe al
 * revés»).
 *
 * Es EXACTAMENTE el fallo de arriba, en el único sitio donde se quedó vivo. La
 * celda era `<td contentEditable ...>{celda}</td>`: React pintaba el texto como
 * hijo, así que en cada re-render lo reescribía y el cursor se iba al
 * principio. La letra siguiente entraba delante de la anterior.
 *
 * Y aquí re-renders hay de sobra: el autoguardado toca estado en cada tecla, y
 * «+ fila» y «+ columna» llaman a `setBloques` a propósito.
 *
 * MISMA REGLA: mientras se escribe, el dueño del texto es el DOM. El texto se
 * pone una vez al montar y React no vuelve a tocar el contenido de la celda.
 *
 * (Se separa de `BloqueEditable` en vez de generalizarlo con una prop de
 * etiqueta porque un `<td>` solo es válido dentro de un `<tr>`: un componente
 * que sirva para los dos casos invita a usarlo donde no toca. Son diez líneas
 * duplicadas a cambio de que el tipo de elemento sea imposible de equivocar.)
 */
function CeldaEditable({ inicial, ...props }: { inicial: string } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  const ref = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = inicial;
    // Sin `inicial` en las dependencias, por lo mismo que arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <td ref={ref} {...props} />;
}


/**
 * EL TÍTULO, QUE PARTE LÍNEA Y CRECE SOLO (2026-08-21, B47).
 *
 * Esto era un `<input>`, y un `<input>` NO PARTE LÍNEA NUNCA: cuando el texto
 * no cabe, se desplaza por dentro. Con la letra de 36 px del título, en un
 * teléfono de 390 px caben unos diez caracteres, así que «Incendios forestales
 * en España en 2025» se veía como «Incendios forestale». En un móvil no podías
 * ver el título de tu propia página.
 *
 * La salida barata era bajar la letra en móvil. No sirve: con un título largo
 * vuelves a lo mismo un poco más tarde, y de paso el título deja de parecer un
 * título. Lo que hace falta es que parta línea, y para eso tiene que ser un
 * `<textarea>` — que sí parte, pero no crece solo, así que se le mide y se le
 * pone el alto a mano.
 *
 * ENTER NO METE UNA LÍNEA NUEVA. Un título es UN texto que se parte solo
 * porque no cabe, no un párrafo con saltos: si dejáramos escribir saltos, el
 * mismo título se guardaría con «\n» dentro y saldría partido en sitios raros
 * en el menú, en las tarjetas y en las pestañas, donde sí es un `<input>` o un
 * `<span>`.
 */
function TituloEditable({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Medir y ajustar. `height:auto` primero es obligatorio: sin eso
  // `scrollHeight` nunca baja —mide el alto que ya tiene puesto— y el título
  // crecería al escribir pero no encogería al borrar.
  const ajustar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Al montar y cada vez que cambia el texto. `valor` en las dependencias SÍ,
  // al revés que en `BloqueEditable`: aquí el valor viene de React (no se
  // escribe a mano en el DOM), y el título llega vacío y se rellena cuando
  // contesta el servidor. Sin esto, una página recién abierta enseñaría el
  // alto de una línea con tres líneas de título dentro.
  useEffect(ajustar, [valor, ajustar]);

  // Y al cambiar el ancho de la ventana, porque el ancho decide por cuántas
  // líneas parte. Girar el teléfono es el caso real.
  useEffect(() => {
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [ajustar]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={valor}
      onChange={e => onCambiar(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
      placeholder={tr('Título del documento')}
      className="w-full text-4xl font-black tracking-tight text-slate-900 outline-none placeholder:text-slate-300 mb-1 resize-none overflow-hidden block bg-transparent leading-tight"
    />
  );
}

/** La descripción bajo el título, en el editor. Crece con el texto (admite
 *  varias líneas). No lleva botones: si está escrita se publica con la página,
 *  y se quita borrándola (Eugenio, 2026-10-01). */
function DescripcionEditable({ valor, letra, enfocar, onEnfocado, onCambiar, onVaciar }: {
  valor: string; letra: number; enfocar: boolean; onEnfocado: () => void;
  onCambiar: (v: string) => void; onVaciar: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const ajustar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useEffect(ajustar, [valor, letra, ajustar]);
  useEffect(() => {
    if (enfocar) { ref.current?.focus(); onEnfocado(); }
  }, [enfocar, onEnfocado]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={valor}
      onChange={e => onCambiar(e.target.value)}
      onBlur={() => { if (!valor.trim()) onVaciar(); }}
      placeholder={tr('Escribe una descripción…')}
      aria-label={tr('Descripción de la página')}
      style={{ fontSize: letra }}
      className="mt-2 w-full resize-none overflow-hidden block bg-transparent outline-none leading-snug text-slate-500 placeholder:text-slate-300"
    />
  );
}

/** Una imagen que está subiendo: la foto (en local, al instante), atenuada,
 *  con una barra y el porcentaje. Sin esto, subir una foto de 8 MB son veinte
 *  segundos sin ninguna señal de que algo pasa. */
function SubiendoImagen({ vista, fraccion, texto }: { vista: string | null; fraccion: number; texto: string }) {
  const pct = Math.round(fraccion * 100);
  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-2xl bg-slate-100" role="status" aria-live="polite">
      {vista
        ? <img src={vista} alt="" className="block w-full max-h-72 object-contain opacity-40" />
        : <div className="h-40" />}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-xs rounded-xl bg-white/95 shadow-lg px-4 py-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> {texto}…</span>
            <span className="tabular-nums">{pct < 100 ? `${pct}%` : 'Casi…'}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-[width] duration-200" style={{ width: `${Math.max(3, pct)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">No cierres la página hasta que termine.</p>
        </div>
      </div>
    </div>
  );
}

/** La flecha de un desplegable o un título plegable: gira al abrirse. */
function FlechaPlegar({ abierto, onClick }: { abierto: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick(); }}
      aria-label={abierto ? 'Cerrar' : 'Abrir'} aria-expanded={abierto}
      className="mt-0.5 w-6 h-6 shrink-0 grid place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
      <ChevronRight className={cn('w-4 h-4 transition-transform', abierto && 'rotate-90')} />
    </button>
  );
}

/** Un marcador o una web recién creados desde «/»: se les pega la dirección. */
function EntradaEnlace({ tipo, onListo, onSubir }: { tipo: 'marcador' | 'web' | 'video' | 'embed'; onListo: (url: string) => void; onSubir?: () => void }) {
  const [v, setV] = useState('');
  const [fallo, setFallo] = useState(false);
  const enviar = () => {
    const url = /^https?:\/\//i.test(v.trim()) ? v.trim() : v.trim() ? `https://${v.trim()}` : '';
    try {
      if (!url) throw 0;
      new URL(url);
      // Un incrustado sólo acepta los servicios de la lista blanca.
      if (tipo === 'embed' && !embedDe(url)) throw 0;
      onListo(url);
    } catch { setFallo(true); }
  };
  const Icono = tipo === 'marcador' ? Bookmark : tipo === 'video' ? Play : tipo === 'embed' ? PanelTop : Globe;
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-dashed border-slate-300 bg-slate-50">
      <Icono className="w-4 h-4 text-slate-400 shrink-0" />
      <input autoFocus value={v} onChange={e => { setV(e.target.value); setFallo(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } }}
        placeholder={tipo === 'embed' ? 'Pega un enlace de Figma, Maps, Drive, Spotify, Loom, CodePen, X, Miro…' : tipo === 'marcador' ? 'Pega el enlace para crear el marcador…' : tipo === 'video' ? 'Pega el enlace de YouTube o Vimeo…' : 'Pega el enlace de la web que quieres insertar…'}
        className={cn('flex-1 min-w-[10rem] h-9 px-2 rounded-lg border bg-white text-sm outline-none', fallo ? 'border-rose-300' : 'border-slate-200 focus:border-emerald-400')} />
      <button type="button" onClick={enviar} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold">
        {tipo === 'marcador' ? 'Crear marcador' : 'Insertar'}
      </button>
      {fallo && tipo === 'embed' && <p className="basis-full text-xs font-bold text-rose-600">Ese enlace no es de un servicio compatible (Figma, Google Maps/Drive/Docs/Slides, Spotify, SoundCloud, Loom, CodePen, X o Miro).</p>}
      {tipo === 'video' && onSubir && (
        <button type="button" onClick={onSubir} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100">
          o sube un vídeo
        </button>
      )}
    </div>
  );
}
