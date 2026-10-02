import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subirArchivo } from '../utils/subir';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Code2, Image as ImageIcon, Table2, Trash2, Globe, Lock,
  ChevronRight, Info,
  LayoutTemplate, LayoutGrid,
  Download, Sparkles, Loader2, ArrowLeft, FileText, GripVertical, Boxes, Store, ImagePlus,
  Search, X, Wand2, PenLine, Smile, Paperclip, Share2, Settings2, EyeOff, Eye, AlignLeft, ExternalLink, PenTool, MoreHorizontal, Maximize2, Minimize2,
  PanelTop, Bookmark, Link2, Play,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEsMovil } from '../hooks/useEsMovil';
import Rejilla from '../components/tablas/Rejilla';
import WindowContent from '../components/knowledge/WindowContent';
import DialogoCompartir from '../components/knowledge/DialogoCompartir';
import AjustesPagina, { CLAVES_AJUSTES, type Ajustes } from '../components/knowledge/AjustesPagina';
import CreadorMenu from '../components/knowledge/CreadorMenu';
import MenuBloque from '../components/knowledge/MenuBloque';
import PropiedadesFila from '../components/tablas/PropiedadesFila';
import TextoEnriquecido from '../components/knowledge/TextoEnriquecido';
import { TarjetaMarcador, WebInsertada, leerEnlace } from '../components/knowledge/BloqueEnlace';
import { repintar, ponerCursor } from '../utils/marcadoVivo';
import EnlaceSubpagina from '../components/knowledge/EnlaceSubpagina';
import BloquePizarra from '../components/knowledge/BloquePizarra';
import { claseColor, PINTAN_SU_COLOR } from '../utils/coloresBloque';
import { LayoutCabecera, MandosCabecera, FilaTitulo, ladoIcono, letraDescripcion } from '../components/knowledge/CabeceraPagina';
import IconoElemento from '../components/ui/Icono';
import EditorImagen from '../components/knowledge/EditorImagen';
import {
  type Bloque, type TipoBloque, nuevoIdBloque, markdownABloques, bloquesAMarkdown, enFilas,
  AIRE_BASE_DATOS,
} from '../utils/bloques';
import { leerPegado, tamanoLegible, idYoutube, idVimeo, enCampoDeTexto } from '../utils/pegado';
import PortadaPdf from '../components/ui/PortadaPdf';
import HojaCrear from '../components/navegacion/HojaCrear';
import {
  PreviaPagina, PreviaArchivos, PreviaTabla, PreviaPublicaciones, PreviaComercio,
} from '../components/bienvenida/previas';
import { abrirLateral } from '../components/ventanas/bus';
import { cn } from '../utils/cn';
import CrearProducto from '../components/knowledge/CrearProducto';
// La tabla de estilos de los bloques vive en el LECTOR, y el editor la
// importa de allí. Una sola definición: lo que se escribe y lo que se
// publica tienen que verse igual, y con dos copias el fallo sale siempre en
// la pantalla pública, que es la que nadie mira.
import { CLASES_TEXTO } from '../components/knowledge/BloquesLectura';
import Adjuntos from '../components/archivo/Adjuntos';

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

const TIPOS_MENU: { tipo: TipoBloque; label: string; icon: any }[] = [
  { tipo: 'parrafo', label: 'Texto', icon: Type },
  { tipo: 'titulo1', label: 'Título 1', icon: Heading1 },
  { tipo: 'titulo2', label: 'Título 2', icon: Heading2 },
  { tipo: 'titulo3', label: 'Título 3', icon: Heading3 },
  { tipo: 'lista', label: 'Lista', icon: List },
  { tipo: 'numerada', label: 'Lista numerada', icon: ListOrdered },
  { tipo: 'tarea', label: 'Casilla', icon: CheckSquare },
  { tipo: 'cita', label: 'Cita', icon: Quote },
  // Los tres de Notion que faltaban (2026-08-23). Van aquí arriba, entre los
  // de texto, porque es lo que son: formas de escribir, no cosas que se
  // embeben.
  { tipo: 'desplegable', label: 'Desplegable', icon: ChevronRight },
  { tipo: 'aviso', label: 'Aviso', icon: Info },
  { tipo: 'indice', label: 'Índice', icon: List },
  // Una página dentro de ésta (2026-09-30): «todo son páginas dentro de
  // páginas, como hace Notion».
  { tipo: 'subpagina', label: 'Página', icon: FileText },
  // La pizarra de «Esquemas», dentro de la página (2026-10-01).
  { tipo: 'pizarra', label: 'Pizarra', icon: PenTool },
  // Un enlace como tarjeta, o la web dentro de la página (2026-10-02). Se
  // llega aquí también pegando un enlace: ver `alPegar`.
  { tipo: 'marcador', label: 'Marcador web', icon: Bookmark },
  { tipo: 'web', label: 'Web insertada', icon: Globe },
  { tipo: 'separador', label: 'Separador', icon: Minus },
  { tipo: 'codigo', label: 'Código', icon: Code2 },
  { tipo: 'imagen', label: 'Imagen', icon: ImageIcon },
  // Subir un archivo cualquiera (2026-09-30). Sustituye a la sección fija de
  // «Archivos» del pie: Eugenio, «si alguien quiere subir un archivo, lo sube
  // desde el botón de +».
  { tipo: 'medio', label: 'Archivo', icon: Paperclip },
  // La primera es la buena: columnas con tipo, fórmulas y relaciones. La de
  // texto se queda debajo y dice lo que es, para quien solo quiera una rejilla
  // de texto en un documento.
  { tipo: 'basedatos', label: 'Base de datos', icon: Boxes },
  { tipo: 'tabla', label: 'Tabla de texto', icon: Table2 },
  { tipo: 'publicacion', label: 'Publicación', icon: Boxes },
  { tipo: 'producto', label: 'Producto', icon: Store },
  // LOS BLOQUES DE TIENDA (fase 2 de Comercio). Existían y se podían pintar
  // desde el 2026-08-22, pero no había forma de ponerlos: sólo entraban
  // escribiendo el JSON a mano. Un bloque que sólo sabe crear quien conoce la
  // base de datos no existe para quien usa la aplicación.
  { tipo: 'portada', label: 'Portada de tienda', icon: LayoutTemplate },
  { tipo: 'rejilla', label: 'Rejilla de productos', icon: LayoutGrid },
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
function Inline({ texto }: { texto: string }) {
  return <TextoEnriquecido texto={texto} />;
}

export default function Documento() {
  const { id } = useParams<{ id: string }>();
  return <EditorPagina key={id} />;
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
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(esNuevo);
  const [guardado, setGuardado] = useState<'sí' | 'pendiente' | 'guardando'>('sí');
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null); // id del bloque cuyo + está abierto
  /** El buscador está buscando PRODUCTOS, no publicaciones. */
  const [buscaProducto, setBuscaProducto] = useState(false);

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
  const [menuSitioAbierto, setMenuSitioAbierto] = useState(false);
  /** Los mandos de «Diseño de la cabecera» a la vista. */
  const [disenoAbierto, setDisenoAbierto] = useState(false);
  /** Recién pulsado «Añadir descripción»: el cursor va a ella. */
  const [focoDescripcion, setFocoDescripcion] = useState(false);
  const iconoFileRef = useRef<HTMLInputElement>(null);
  const [subiendoIcono, setSubiendoIcono] = useState(false);
  const [falloIcono, setFalloIcono] = useState<string | null>(null);
  const [eligiendoIcono, setEligiendoIcono] = useState(false);
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
  /** Fotos de la estructura antes de cada cambio que no se deshace tecleando. */
  const historia = useRef<Bloque[][]>([]);
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
  const cargar = useCallback((winId: string) => {
    fetch(`/api/windows/${winId}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se ha podido cargar.');
        setTitulo(j.title || '');
        setFilaDe(j.fila_de || null);
        setAutor(j.autor_nombre || null);
        setPublico(!!j.publico);
        setPuedoEditar(!!j.puedo_editar);
        setPortada(j.config?.portada || null);
        setIcono(j.config?.icono || null);
        const aj: Ajustes = {};
        for (const k of CLAVES_AJUSTES) if (j.config?.[k] !== undefined) (aj as any)[k] = j.config[k];
        setAjustes(aj);
        let bs: Bloque[] = j.config?.bloques || [];
        // Documentos guardados antes del arreglo del título duplicado: si el
        // primer bloque es un H1 idéntico al título, se omite (y el próximo
        // autoguardado lo retira del todo).
        if (bs[0]?.tipo === 'titulo1' && bs[0].texto?.trim() === (j.title || '').trim()) bs = bs.slice(1);
        for (const b of bs) {
          if (b.texto !== undefined) textosRef.current[b.id] = b.texto;
          if (b.filas) filasRef.current[b.id] = b.filas;
        }
        setBloques(bs.length ? normalizarGrupos(bs) : [{ id: nuevoIdBloque(), tipo: 'parrafo', texto: '' }]);
      })
      .catch(e => setError(e.message))
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
                setBloques(markdownABloques(buffer));
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

  const guardarAhora = useCallback(async (estructura?: Bloque[]) => {
    if (!docId.current || !puedoEditar) return;
    setGuardado('guardando');
    const bs = estructura ?? serializar();
    const meta = metaRef.current;
    const r = await fetch(`/api/windows/${docId.current}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meta.titulo || 'Documento sin título',
        // Los ajustes van en la misma `config`: si no se mandaran, cada
        // guardado automático los borraría.
        config: { ...meta.ajustes, bloques: bs, portada: meta.portada || undefined, icono: meta.icono || undefined },
      }),
    }).catch(() => null);
    setGuardado(r?.ok ? 'sí' : 'pendiente');
  }, [puedoEditar, serializar]);

  const programarGuardado = useCallback(() => {
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
      if (d.entityId === docId.current) { clearTimeout(timerGuardado.current); cargar(docId.current); }
      if (d.tabla_id && bloquesRef.current.some(b => (b as any).tabla_id === d.tabla_id)) setVersionDatos(v => v + 1);
    };
    window.addEventListener('humanity:ia-va-a-leer', alLeer);
    window.addEventListener('humanity:contenido-cambiado', alCambiar);
    return () => {
      window.removeEventListener('humanity:ia-va-a-leer', alLeer);
      window.removeEventListener('humanity:contenido-cambiado', alCambiar);
    };
  }, [guardarAhora, cargar]);

  // Al irse de la página (p. ej. a una tarjeta de su galería) lo que quedaba
  // por guardar se guarda YA, en vez de tirarse con el temporizador.
  const guardarAhoraRef = useRef(guardarAhora);
  guardarAhoraRef.current = guardarAhora;
  const hayPendiente = useRef(false);
  useEffect(() => { hayPendiente.current = guardado === 'pendiente'; }, [guardado]);
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
  const elegirDeLaBarra = (b: Bloque, tipo: TipoBloque) => {
    setBarra(null);
    const el = document.querySelector(`[data-bloque="${b.id}"]`) as HTMLElement | null;
    if (el) el.textContent = '';
    textosRef.current[b.id] = '';
    if (tipo === 'publicacion' || tipo === 'producto') { insertar(b.id, tipo); return; }
    if (tipo === 'separador' || tipo === 'imagen' || tipo === 'tabla' || tipo === 'basedatos' || tipo === 'subpagina' || tipo === 'medio' || tipo === 'pizarra' || tipo === 'marcador' || tipo === 'web') { insertar(b.id, tipo); return; }
    setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo, texto: '' } : x));
    setFocoId(b.id);
    programarGuardado();
  };

  const insertar = (tras: string | null, tipo: TipoBloque) => {
    if (tipo === 'subpagina') { crearSubpagina(tras); return; }
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
      setBuscaProducto(tipo === 'producto');
      setBuscadorPub(tras ?? '');
      setBusquedaPub('');
      setResultadosPub([]);
      return;
    }
    const nuevo: Bloque = { id: nuevoIdBloque(), tipo };
    if (tipo === 'tabla') filasRef.current[nuevo.id] = [['', ''], ['', '']];
    if (tipo !== 'separador' && tipo !== 'imagen' && tipo !== 'tabla' && tipo !== 'marcador' && tipo !== 'web') textosRef.current[nuevo.id] = '';
    setBloques(bs => {
      const i = tras ? finDeFila(bs, bs.findIndex(b => b.id === tras)) : -1;
      const copia = [...bs];
      copia.splice(i + 1, 0, nuevo);
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
      return copia.length ? copia : [{ id: nuevoIdBloque(), tipo: 'parrafo' }];
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
    return tramos.map(x => (x.grupo && cuenta[x.grupo] < 2 ? { ...x, grupo: undefined } : x));
  };

  const guardarHistoria = () => {
    historia.current.push(serializar());
    if (historia.current.length > 50) historia.current.shift();
  };

  const avisar = (texto: string) => {
    setAviso(texto);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 6000);
  };

  const deshacer = () => {
    const antes = historia.current.pop();
    if (!antes) return;
    for (const x of antes) {
      if (x.texto !== undefined) textosRef.current[x.id] = x.texto;
      if (x.filas) filasRef.current[x.id] = x.filas;
    }
    setBloques(antes);
    setAviso(null);
    programarGuardado();
  };

  const borrarBloque = (bid: string) => {
    guardarHistoria();
    setMenuAsa(null);
    eliminar(bid);
    setBloques(bs => normalizarGrupos(bs));
    avisar('Bloque borrado');
  };

  const duplicar = (bid: string) => {
    guardarHistoria();
    setMenuAsa(null);
    const nuevoId = nuevoIdBloque();
    setBloques(bs => {
      const i = bs.findIndex(x => x.id === bid);
      if (i < 0) return bs;
      const o = bs[i];
      const copia: Bloque = {
        ...o, id: nuevoId, grupo: undefined,
        texto: o.texto !== undefined || textosRef.current[o.id] !== undefined ? (textosRef.current[o.id] ?? o.texto ?? '') : undefined,
        filas: filasRef.current[o.id] ? filasRef.current[o.id].map(f => [...f]) : o.filas,
      };
      if (copia.texto !== undefined) textosRef.current[nuevoId] = copia.texto;
      if (copia.filas) filasRef.current[nuevoId] = copia.filas;
      // En columnas, la copia va debajo de toda la fila: una columna aquí no
      // apila bloques dentro.
      let j = i;
      while (o.grupo && bs[j + 1]?.grupo === o.grupo) j++;
      const lista = [...bs];
      lista.splice(j + 1, 0, copia);
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
  const mover = (bid: string, d: NonNullable<typeof destino>) => {
    if (bid === d.id) return;
    guardarHistoria();
    setBloques(bs => {
      const movido = bs.find(x => x.id === bid);
      if (!movido) return bs;
      let lista = normalizarGrupos(bs.filter(x => x.id !== bid));
      const t = lista.findIndex(x => x.id === d.id);
      if (t < 0) return bs;
      const obj = lista[t];
      if (d.lado === 'izquierda' || d.lado === 'derecha') {
        const g = obj.grupo || `G${nuevoIdBloque()}`;
        lista = lista.map(x => (x.id === obj.id ? { ...x, grupo: g } : x));
        lista.splice(d.lado === 'izquierda' ? t : t + 1, 0, { ...movido, grupo: g });
      } else {
        // Encima o debajo de un bloque en columnas es encima o debajo de TODA
        // la fila: meterlo en medio partiría las columnas en dos.
        let i = t, j = t;
        while (obj.grupo && lista[i - 1]?.grupo === obj.grupo) i--;
        while (obj.grupo && lista[j + 1]?.grupo === obj.grupo) j++;
        lista.splice(d.lado === 'arriba' ? i : j + 1, 0, { ...movido, grupo: undefined });
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
    /** Dónde caería el bloque si se soltara en (x, y). */
    const calcular = (x: number, y: number) => {
      const caja = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-bloque-caja]');
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
      if (!movido) setMenuAsa(m => (m === bid ? null : bid));
      else if (destinoRef.current) mover(bid, destinoRef.current);
      destinoRef.current = null;
      setDestino(null);
      setArrastre(null);
    };
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSoltar);
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
      const i = tras ? finDeFila(bs, bs.findIndex(x => x.id === tras)) : bs.length - 1;
      const copia = [...bs];
      copia.splice(i + 1, 0, nuevo);
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
    const i = tras ? finDeFila(lista, lista.findIndex(x => x.id === tras)) : lista.length - 1;
    lista.splice(i + 1, 0, nuevo);
    setBloques(lista);
    await guardarAhora(lista);
    navigate(`/paginas/${j.id}`);
  };

  // ⌘Z fuera de un texto deshace lo último (borrar, mover, duplicar…). Dentro
  // de un bloque manda el navegador, que sabe deshacer lo tecleado.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      const activo = document.activeElement as HTMLElement | null;
      if (activo && (activo.isContentEditable || activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')) return;
      // Dentro de una pizarra, ⌘Z deshace en la pizarra, no en la página.
      if (document.querySelector('[data-pizarra-activa]')) return;
      if (!historia.current.length) return;
      e.preventDefault();
      deshacer();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

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
            .filter((x: any) => x.id !== docId.current)
            .map((x: any) => buscaProducto ? { ...x, tipo: 'producto', titulo: x.name || x.nombre } : x)
            .slice(0, 12));
        })
        .catch(() => setResultadosPub([]));
    }, 250);
    return () => clearTimeout(t);
  }, [buscadorPub, busquedaPub]);

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
      const i = finDeFila(bs, bs.findIndex(b => b.id === buscadorPub));
      const copia = [...bs];
      copia.splice(i + 1, 0, nuevo);
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
      const nuevos: Bloque[] = j.bloques || [];
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
      // Enter en un ítem vacío de lista lo convierte en párrafo, como Notion.
      if (heredan.includes(b.tipo) && !texto.trim()) {
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo: 'parrafo' } : x));
        programarGuardado();
        return;
      }
      // Enter PARTE el texto por el cursor: lo de antes se queda, lo de
      // después baja al bloque nuevo con el cursor a su inicio (como Notion).
      const corte = offsetCaret(el);
      const antes = texto.slice(0, corte);
      const despues = texto.slice(corte);
      textosRef.current[b.id] = antes;
      const nuevo: Bloque = { id: nuevoIdBloque(), tipo: heredan.includes(b.tipo) ? b.tipo : 'parrafo', texto: despues };
      textosRef.current[nuevo.id] = despues;
      setBloques(bs => {
        const i = finDeFila(bs, bs.findIndex(x => x.id === b.id));
        const copia = bs.map(x => x.id === b.id ? { ...x, texto: antes } : x);
        copia.splice(i + 1, 0, nuevo);
        return copia;
      });
      setBloqueActivo(nuevo.id);
      posicionCaret.current = 0;
      setFocoId(nuevo.id);
      programarGuardado();
    } else if (e.key === 'Backspace') {
      const texto = el.textContent || '';
      if (!texto) {
        e.preventDefault();
        eliminar(b.id);
        return;
      }
      // Backspace con el cursor al principio FUSIONA con el bloque de texto
      // anterior, dejando el cursor en la juntura (como Notion).
      if (offsetCaret(el) === 0) {
        const i = bloques.findIndex(x => x.id === b.id);
        const anterior = bloques[i - 1];
        if (anterior && ES_TEXTO.includes(anterior.tipo)) {
          e.preventDefault();
          const textoAnterior = textosRef.current[anterior.id] ?? anterior.texto ?? '';
          const fusionado = textoAnterior + texto;
          textosRef.current[anterior.id] = fusionado;
          delete textosRef.current[b.id];
          setBloques(bs => bs
            .map(x => x.id === anterior.id ? { ...x, texto: fusionado } : x)
            .filter(x => x.id !== b.id));
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
      [/^\[\s?\]\s/, 'tarea'], [/^```/, 'codigo'],
    ];
    for (const [re, tipo] of reglas) {
      if (re.test(texto)) {
        const limpio = texto.replace(re, '');
        textosRef.current[b.id] = limpio;
        setBloques(bs => bs.map(x => x.id === b.id ? { ...x, tipo, texto: limpio } : x));
        posicionCaret.current = 0;
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
    for (const n of nuevos) if (n.texto !== undefined) textosRef.current[n.id] = n.texto;
    setBloques(bs => {
      if (!b) return [...bs, ...nuevos];
      const i = bs.findIndex(x => x.id === b.id);
      const copia = [...bs];
      // Sobre un bloque vacío lo sustituyen (y heredan su columna); con
      // texto, van detrás de la fila.
      if (vacio && b.grupo && nuevos.length === 1) nuevos = [{ ...nuevos[0], grupo: b.grupo }];
      copia.splice(vacio ? i : finDeFila(bs, i) + 1, vacio ? 1 : 0, ...nuevos);
      return copia;
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
  // ── EL MENÚ DE «¿QUÉ HAGO CON ESTE ENLACE?» (2026-10-02) ────────────────
  const [menuEnlace, setMenuEnlace] = useState<{
    bloqueId: string; url: string; x: number; y: number;
    video: { medio: 'youtube' | 'vimeo'; id: string } | null;
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
    setMenuEnlace({ bloqueId, url, x, y, video, insertable: video ? true : null, elegido: 0 });
    if (!video) {
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
    if (!puedoEditar || generando) return;
    const alPegarEnLaPagina = (e: ClipboardEvent) => {
      // Trabajando en una pizarra incrustada, lo pegado es suyo.
      if (document.querySelector('[data-pizarra-activa]')) return;
      if (enCampoDeTexto(e.target)) return;   // ya lo atiende el bloque, o es un formulario
      if (!e.clipboardData) return;
      const dt = e.clipboardData;
      if (!dt.files?.length && !(dt.getData('text/plain') || '').trim() && !dt.getData('text/html')) return;
      e.preventDefault();
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
  }, [puedoEditar, generando, bloquesDelPortapapeles, insertarBloques]);

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
    historia.current.push(serializar());
    setAviso(seleccion.length === 1 ? 'Bloque borrado' : `${seleccion.length} bloques borrados`);
    setBloques(bs => {
      const restantes = normalizarGrupos(bs.filter(x => !seleccion.includes(x.id)));
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
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [seleccion, eliminarSeleccion]);

  // Enfocar el bloque recién creado/activado cuando ya está en el DOM. Por
  // defecto el cursor va al final; `posicionCaret` lo coloca en un punto
  // concreto (partir con Enter deja el cursor al INICIO del bloque nuevo;
  // fusionar con Backspace lo deja en la juntura).
  const posicionCaret = useRef<number | null>(null);
  useEffect(() => {
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
    setBloques(bs => bs.map(x => x.id === b.id ? { ...x, url: sub.url } : x));
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
  const editable = puedoEditar && !generando;

  // Sin barra flotante (2026-10-02) ya no hay que reservarle hueco abajo.

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
            <EntradaEnlace tipo={b.tipo}
              onListo={url => {
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
        return b.url ? (
          <figure className="group/img relative">
            <img src={b.url} alt={b.pie || ''} className="rounded-xl max-w-full border border-slate-100" />
            {editable && (
              <button
                onClick={e => { e.stopPropagation(); setImagenEditando(b.id); }}
                className="absolute top-2 right-2 px-2.5 py-1 bg-white/90 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
              >
                Editar imagen
              </button>
            )}
            {b.pie && <figcaption className="text-xs text-slate-400 mt-1">{b.pie}</figcaption>}
          </figure>
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
                      <CeldaEditable key={ci} inicial={celda}
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
          // Con la barra abierta, lo que escribes ES el filtro. Si borras la
          // «/» o te vas a otra línea, se cierra sola.
          if (barra && barra.bloque === b.id) {
            if (!t.startsWith('/')) setBarra(null);
            else setBarra(x => x && ({ ...x, texto: t.slice(1), elegido: 0 }));
            return;
          }
          autoformato(b, e.currentTarget);
          programarGuardado();
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => alTeclear(b, e),
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
        ? <BloqueEditable key={`${b.id}-edit`} inicial={texto} vivo={b.tipo !== 'codigo'} {...comun} className={cn(comun.className, extra)} />
        : <div key={`${b.id}-ver`} {...comun} className={cn(comun.className, extra)}><Inline texto={texto} /></div>;

      if (b.tipo === 'cita') {
        return <blockquote className="border-l-[3px] border-emerald-300 pl-3">{cuerpo()}</blockquote>;
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

      if (b.tipo === 'desplegable') {
        return (
          <div className="border-l-2 border-slate-200 pl-3">
            <div className="flex items-start gap-1.5">
              <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-slate-400" />
              {cuerpo('flex-1 min-w-0 font-bold')}
            </div>
            {/* SE DICE LO QUE VA A PASAR AL PUBLICAR, porque aquí no se puede
                enseñar: en el editor todo está abierto para poder escribirlo.
                Sin esta línea, quien lo pone no entiende para qué sirve. */}
            {editable && (
              <p className="mt-1 text-[11px] text-slate-400">
                Al publicarla, esto se verá cerrado y se abre al pulsarlo.
              </p>
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
      if (b.tipo === 'lista' || b.tipo === 'numerada') {
        // El número real se calcula contando los hermanos seguidos del mismo tipo.
        let n = 1;
        if (b.tipo === 'numerada') {
          for (let i = indice - 1; i >= 0 && bloques[i].tipo === 'numerada'; i--) n++;
        }
        return (
          <div className="flex gap-2">
            <span className="text-slate-400 select-none shrink-0 w-5 text-right leading-relaxed text-[15px]">
              {b.tipo === 'lista' ? '•' : `${n}.`}
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

    const esBloqueTexto = !['separador', 'imagen', 'tabla', 'publicacion', 'producto', 'medio', 'subpagina', 'pizarra'].includes(b.tipo);

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
          seleccion.includes(b.id) && 'ring-2 ring-emerald-400 bg-emerald-50/60')}
        onClickCapture={editable ? e => { clicSeleccion(b, e); } : undefined}
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
              title="Añadir un bloque debajo"
              aria-label="Añadir un bloque debajo"
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
                aria-label="Opciones del bloque"
                onPointerDown={e => empezarArrastre(b.id, e)}
                title="Arrastra para mover · clic para opciones"
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
          <div className="absolute left-0 top-full z-40 mt-1 w-64 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1"
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
                <t.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {t.label}
              </button>
            ))}
          </div>
        )}

        {menuAbierto === b.id && (
          <div className="absolute left-0 top-full z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 grid grid-cols-2 gap-0.5 w-72"
            onClick={e => e.stopPropagation()}>
            {TIPOS_MENU.map(t => (
              <button key={t.tipo} onClick={() => insertar(b.id, t.tipo)}
                className={cn('flex items-center gap-2 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors',
                  esMovil ? 'h-11' : 'py-1.5')}>
                <t.icon className="w-3.5 h-3.5 text-slate-400" /> {t.label}
              </button>
            ))}
            {esBloqueTexto && (
              <button onClick={() => iaMejorar(b)}
                className={cn('col-span-2 flex items-center gap-2 px-2.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 text-left transition-colors',
                  esMovil ? 'h-11' : 'py-1.5')}>
                <Wand2 className="w-3.5 h-3.5" /> Mejorar este texto con IA
              </button>
            )}
            <button onClick={() => { eliminar(b.id); setMenuAbierto(null); }}
              className={cn('col-span-2 flex items-center gap-2 px-2.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 text-left transition-colors',
                esMovil ? 'h-11' : 'py-1.5')}>
              <Trash2 className="w-3.5 h-3.5" /> Eliminar este bloque
            </button>
          </div>
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

  if (cargando) return <p className="text-sm text-slate-400 text-center py-24">Abriendo el documento…</p>;

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
            <ArrowLeft className="w-3.5 h-3.5" /> Volver atrás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* SIEMPRE A ANCHO COMPLETO (2026-10-02, Eugenio: «quita la opción de
          que no sea ancho completo»). El mismo ancho que la página publicada. */}
      <div className="mx-auto px-6 sm:px-12 pt-8 pb-32 max-w-6xl">

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
              <span className={cn('font-bold', subiendo ? 'text-emerald-600' : guardado === 'sí' ? 'text-slate-300' : 'text-amber-600')}>
                {subiendo
                  ? subiendo
                  : guardado === 'sí' ? 'Guardado' : guardado === 'guardando' ? 'Guardando…' : 'Cambios sin guardar'}
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
                  <ExternalLink className="w-3 h-3" /> Ver página publicada
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
            <button onClick={() => setMenuSitioAbierto(true)} title="Menú y pie de página de la web"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
              <PanelTop className="w-4 h-4" /> Menú y pie
            </button>
          )}
          {editable && (
            <button onClick={() => setMenuSitioAbierto(true)} title="Menú y pie de página de la web" aria-label="Menú y pie de página de la web"
              className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              <PanelTop className="w-4 h-4" />
            </button>
          )}
          {editable && (
            <button onClick={() => setAjustesAbierto(true)} title="Ajustes de la página" aria-label="Ajustes de la página"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setCompartirAbierto(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">
            <Share2 className="w-3.5 h-3.5" /> Compartir
          </button>

          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setMenuDescargar(m => !m); }} title="Descargar"
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
        </div>

        <div
          ref={docRef}
          onDragOver={e => { if (!arrastrando && traeArchivos(e.dataTransfer)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setArchivoEncima(true); } }}
          onDragLeave={e => { if (e.currentTarget === e.target) setArchivoEncima(false); }}
          onDrop={alSoltarArchivos}
          className={cn('bg-white rounded-2xl transition-colors',
            archivoEncima && 'ring-2 ring-emerald-400 ring-offset-4')}
        >
        {/* SUÉLTALO AQUÍ. Solo mientras hay algo volando encima. */}
        {archivoEncima && (
          <p className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-dashed border-emerald-300 text-xs font-bold text-emerald-700">
            Suelta el archivo y lo añado al final de la página.
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
                  <label className="px-2 py-1 bg-white/90 rounded-lg text-[10px] font-black text-slate-600 cursor-pointer">
                    Cambiar
                    <input type="file" accept="image/*,.heic,.heif" className="hidden"
                      onChange={e => e.target.files?.[0] && subirPortada(e.target.files[0])} />
                  </label>
                  <button onClick={() => { setPortada(null); programarGuardado(); }}
                    className="px-2 py-1 bg-white/90 rounded-lg text-[10px] font-black text-slate-600">
                    Quitar
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
                    <Smile className="w-3.5 h-3.5" /> Añadir icono
                  </button>
                )}
                {eligiendoIcono && (
                  <div className="flex items-center gap-1 flex-wrap">
                  <>
                    {EMOJIS_ICONO.map(e => (
                      <button key={e} onClick={() => { setIcono(e); setEligiendoIcono(false); programarGuardado(); }}
                        className="text-lg hover:scale-125 transition-transform">{e}</button>
                    ))}
                    {/* …o una imagen tuya, por la misma ruta de subida que
                        usa todo lo demás. */}
                    <input ref={iconoFileRef} type="file" accept="image/*,.heic,.heif" className="hidden"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        setSubiendoIcono(true); setFalloIcono(null);
                        try {
                          // Un icono se ve a 128 px como mucho: 512 sobra
                          // incluso en pantallas retina, y pesa diez veces menos.
                          const sub = await subirArchivo(f, undefined, undefined, { maxLado: 512 });
                          if (sub.url) { setIcono(sub.url); setEligiendoIcono(false); programarGuardado(); }
                          // ANTES SE CALLABA (2026-10-02): un HEIC rechazado no
                          // hacía nada y parecía que el botón no funcionaba.
                          else setFalloIcono(sub.error || 'No se ha podido subir la imagen.');
                        } finally { setSubiendoIcono(false); }
                      }} />
                    <button onClick={() => iconoFileRef.current?.click()} disabled={subiendoIcono}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 ml-1">
                      {subiendoIcono ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                      Imagen
                    </button>
                    <button onClick={() => { setIcono(null); setEligiendoIcono(false); programarGuardado(); }}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-500 ml-1">Quitar</button>
                    {falloIcono && <span role="alert" className="basis-full text-[11px] font-bold text-rose-600">{falloIcono}</span>}
                  </>
                  </div>
                )}
                {!portada && !eligiendoIcono && (
                  <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors cursor-pointer">
                    <ImageIcon className="w-3.5 h-3.5" /> Añadir portada
                    <input type="file" accept="image/*,.heic,.heif" className="hidden"
                      onChange={e => e.target.files?.[0] && subirPortada(e.target.files[0])} />
                  </label>
                )}
                {ajustes.subtitulo === undefined && !eligiendoIcono && (
                  <button onClick={() => { setAjustes(a => ({ ...a, subtitulo: '' })); setFocoDescripcion(true); }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors">
                    <AlignLeft className="w-3.5 h-3.5" /> Añadir descripción
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
            onCambiar={v => { setTitulo(v); programarGuardado(); }}
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
            <Sparkles className="w-5 h-5" /> <span className="hidden sm:inline">IA</span>
          </button>
        )}
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
        {menuSitioAbierto && (
          <CreadorMenu sitio={ajustes.sitio} titulo={titulo} icono={icono}
            opciones={{
              secciones: bloques.filter(b => ['titulo1', 'titulo2', 'titulo3'].includes(b.tipo) && (b as any).texto?.trim())
                .map(b => ({ id: b.id, titulo: String((b as any).texto).replace(/[*_`#]/g, '').trim().slice(0, 60) })),
              paginas: bloques.filter(b => b.tipo === 'subpagina' && (b as any).entityId)
                .map(b => ({ id: (b as any).entityId, titulo: (b as any).pubTitulo || 'Subpágina' })),
            }}
            onCambio={sitio => { setAjustes(a => ({ ...a, sitio })); programarGuardado(); }}
            onCerrar={() => setMenuSitioAbierto(false)} />
        )}
        {ajustesAbierto && (
          <AjustesPagina ajustes={ajustes} portada={portada} titulo={titulo}
            onCambio={a => { setAjustes(a); programarGuardado(); }}
            onCerrar={() => setAjustesAbierto(false)} />
        )}

        {/* Los bloques */}
        <div className={cn('space-y-2', editable && 'pl-0')}>
          {/* Una fila es un bloque suelto o varios en columnas. En un
              teléfono las columnas se apilan: 390 px no caben dos. */}
          {enFilas(bloques).map(fila => fila.length === 1
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
              onClick={e => { e.stopPropagation(); setMenuAbierto(bloques[bloques.length - 1]?.id || null); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir un bloque
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
          <button onClick={() => fallar(null)} aria-label="Cerrar el aviso" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* «Bloque borrado · Deshacer», como en Notion. */}
      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 pl-4 pr-2 h-11 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl">
          <span>{aviso}</span>
          {historia.current.length > 0 && !aviso.startsWith('Enlace') && !aviso.startsWith('http') && (
            <button onClick={deshacer} className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20">Deshacer <span className="text-white/50">⌘Z</span></button>
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
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
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
              setBloques(bs => bs.map(x => x.id === imagenEditando ? { ...x, url } : x));
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
                placeholder={buscaProducto ? 'Busca el producto que quieres insertar…' : 'Busca la publicación que quieres insertar…'}
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
                  {busquedaPub ? 'Nada con ese nombre.'
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
  // sabe ni le importa: para él este div está vacío.
  useEffect(() => {
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
      placeholder="Título del documento"
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
      placeholder="Escribe una descripción…"
      aria-label="Descripción de la página"
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

/** Un marcador o una web recién creados desde «/»: se les pega la dirección. */
function EntradaEnlace({ tipo, onListo }: { tipo: 'marcador' | 'web'; onListo: (url: string) => void }) {
  const [v, setV] = useState('');
  const [fallo, setFallo] = useState(false);
  const enviar = () => {
    const url = /^https?:\/\//i.test(v.trim()) ? v.trim() : v.trim() ? `https://${v.trim()}` : '';
    try { if (!url) throw 0; new URL(url); onListo(url); } catch { setFallo(true); }
  };
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border border-dashed border-slate-300 bg-slate-50">
      {tipo === 'marcador' ? <Bookmark className="w-4 h-4 text-slate-400 shrink-0" /> : <Globe className="w-4 h-4 text-slate-400 shrink-0" />}
      <input autoFocus value={v} onChange={e => { setV(e.target.value); setFallo(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } }}
        placeholder={tipo === 'marcador' ? 'Pega el enlace para crear el marcador…' : 'Pega el enlace de la web que quieres insertar…'}
        className={cn('flex-1 min-w-0 h-9 px-2 rounded-lg border bg-white text-sm outline-none', fallo ? 'border-rose-300' : 'border-slate-200 focus:border-emerald-400')} />
      <button type="button" onClick={enviar} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold">
        {tipo === 'marcador' ? 'Crear marcador' : 'Insertar'}
      </button>
    </div>
  );
}
