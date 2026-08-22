import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, X, Send, Globe, Database, Plus, MessageSquare, Settings2, Check, Ban, Paperclip, FileText, Image as ImageIcon, Network, Mic, MicOff, Cpu, Euro, Eye, ChevronDown, ChevronUp , FolderKanban, ListChecks, Share2, Megaphone, Users2, CalendarDays, Search, Map as MapIcon, Compass, Home, UsersRound, PanelLeftClose, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useEsMovil } from '../../hooks/useEsMovil';
import { useAuth } from '../../contexts/AuthContext';
import { usePanelWidth } from '../../hooks/usePanelWidth';
import { pedirVentanas } from '../ventanas/bus';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import ResizeHandle from '../ui/ResizeHandle';
import PublicationPopup from '../knowledge/PublicationPopup';
import { cn } from '../../utils/cn';
import Markdown from './Markdown';

// ============================================================================
// Asistente IA — panel acoplado (Fase 9, redimensionado en Fase 10)
// ============================================================================
// Botón permanente abajo a la derecha que abre un panel acoplado junto al
// mapa (no superpuesto encima): ocupa una columna real del layout, con un
// 20% de ancho por defecto, redimensionable arrastrando su borde izquierdo,
// y ese ancho queda grabado en la cuenta del usuario (usePanelWidth). En
// pantallas pequeñas, donde un 20% no cabe con sentido, se comporta como un
// cajón a pantalla completa en su lugar.
//
// Piezas clave:
//  - Envía SIEMPRE el estado actual de la pantalla (ruta, territorio,
//    objetivo, indicador… leídos de la URL), para que el modelo conozca el
//    contexto visual sin que el usuario tenga que explicarlo.
//  - Aplica los eventos de interfaz que devuelve el modelo (navegar, hacer
//    zoom, filtrar), de modo que la IA controla la aplicación.
//  - Distingue visualmente el origen de la información: plataforma o internet.
//  - Selector de permisos de edición: manual, aceptar cambios o autónomo.
//  - Las acciones propuestas se confirman con Sí / No, como en Claude Code.

const DESKTOP_BREAKPOINT = 768;

type EditMode = 'manual' | 'aceptar' | 'autonomo';

const EDIT_MODE_LABELS: Record<EditMode, { label: string; hint: string }> = {
  manual:   { label: 'Manual',   hint: 'La IA solo sugiere. No propone cambios aplicables.' },
  aceptar:  { label: 'Aceptar',  hint: 'La IA propone cambios y tú confirmas cada uno.' },
  // «PERMITE EDITAR», NO «AUTÓNOMO» (2026-08-22, Eugenio: «cambia el título de
  // Autónomo y pon "Permite Editar"»). «Autónomo» describe a la IA; lo que hace
  // falta saber es qué le estás dejando hacer a TUS cosas, que es lo que
  // decide esta casilla.
  autonomo: { label: 'Permite editar', hint: 'La IA cambia tus cosas directamente, hasta donde tu rol permita.' },
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ type: string; id: string; origin: string; url?: string; title?: string }>;
  actions?: any[];
  pending?: boolean;
  error?: boolean;
  attachmentName?: string;
  /** Coste real de esta respuesta (créditos de Anthropic + comisión de la plataforma). */
  /** LO QUE COSTÓ. `totalCents` es lo que paga la persona (0 casi siempre);
   *  `costCents` es lo que le cuesta a la plataforma, que no es lo mismo y es
   *  justo lo que Eugenio quería ver. `undefined` significa «no registrado»,
   *  que NO es cero: una cifra de dinero falsa es peor que un hueco. */
  usage?: { model: string; totalCents: number; costCents?: number; durationMs?: number };
  /** El router no dio lo pedido (sin nivel, tope agotado…): se enseña. */
  aviso?: string;
  /** LO QUE SE CREÓ DE VERDAD (2026-08-20). Sale del servidor, no de lo que
   *  el modelo diga: si esta lista está vacía, no se creó nada — por mucho
   *  que el texto diga «ya está». */
  creado?: Array<{ titulo: string; url: string; detalle?: string }>;
  /** Pregunta con opciones (estilo Claude Code): botones 1/2/… + «Otro». */
  question?: { text: string; options: string[]; answered?: boolean };
  /** Imagen generada por Nano Banana, cuando el modelo elegido es de imagen. */
  imageUrl?: string;
  /** Lo que ha encontrado el buscador interno, cuando la pregunta era una
   *  búsqueda y no ha hecho falta la IA. */
  resultados?: Array<{ id: string; uuid?: string; label: string; type: string }>;
  /** El texto original, para poder preguntárselo a la IA de todos modos. */
  reintentarIA?: string;
}

/** EN EUROS, NO EN CÉNTIMOS (2026-08-22, Eugenio: «pon el precio estimado en
 *  céntimos de euro, tipo 0,02 euros, no pongas 2 céntimos, que lías»).
 *
 *  Dos unidades para el mismo dinero en la misma pantalla obligan a convertir
 *  mentalmente antes de comparar, y ahí es donde uno se equivoca de factor
 *  cien. Una sola unidad, la que se usa para todo lo demás: el euro.
 *
 *  Y CUANDO ES DEMASIADO PEQUEÑO, SE DICE. Una respuesta corriente cuesta
 *  milésimas: con dos decimales saldría «0,00 €» en casi todas, que se lee
 *  como gratis y no lo es. Por debajo del céntimo se escribe «menos de
 *  0,01 €», que es verdad y no se confunde con cero. */
const euros = (c: number) => {
  const e = c / 100;
  if (e === 0) return '0 €';
  if (e < 0.01) return 'menos de 0,01 €';
  return e.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

/** Lo que costaría una petición típica con ese modelo.
 *
 *  Los precios del catálogo vienen en céntimos por MILLÓN de tokens, que es
 *  una unidad que no le dice nada a nadie: «300» no se parece a lo que cuesta
 *  escribirle una pregunta. Aquí se convierte a lo que de verdad se paga por
 *  UN mensaje del tamaño que tú sueles mandar.
 *
 *  Es una ESTIMACIÓN y se marca como tal con «≈». El coste real depende de
 *  cuánto conteste el modelo y de cuánto acierte la caché, y por eso debajo de
 *  cada respuesta se enseña el coste medido, que ese sí es exacto. */
const costeEstimado = (
  info: AIModelInfo,
  t?: { entrada: number; salida: number },
) => {
  const tam = t || { entrada: 5000, salida: 500 };
  const c = (tam.entrada * (info.input || 0) + tam.salida * (info.output || 0)) / 1_000_000;
  return '≈ ' + euros(c);
};

/** Cómo se llama cada tipo del buscador en cristiano, y adónde lleva.
 *
 *  LO QUE NO SE SABE ADÓNDE LLEVA, NO SE INVENTA: si el tipo no está aquí, el
 *  enlace va al buscador general en vez de a una dirección construida a ojo
 *  que acabaría en una página vacía. */
const NOMBRE_DE_TIPO: Record<string, string> = {
  publications: 'publicación', challenges: 'reto', solutions: 'solución',
  projects: 'proyecto', organizations: 'organización', products: 'producto',
  territories: 'territorio', objectives: 'objetivo', indicators: 'indicador',
  causes: 'causa', users: 'persona',
};

const RUTA_DE_TIPO: Record<string, (r: any) => string> = {
  // Una publicación no tiene ruta propia: se abre en su ficha, encima de la
  // lista de Explorar. `q` deja la lista filtrada por su título, para que la
  // publicación esté cargada cuando la ficha vaya a buscarla.
  publications: r => `/explorar?abrir=${encodeURIComponent(r.id)}&q=${encodeURIComponent(r.label.slice(0, 40))}`,
  challenges: r => `/retos/${r.id}`,
  solutions: r => `/soluciones/${r.id}`,
  organizations: r => `/organizaciones/${r.id}`,
  products: r => `/mercado?producto=${encodeURIComponent(r.id)}`,
  territories: r => `/territorios/${r.id}`,
  objectives: r => `/objetivos/${r.id}`,
  indicators: r => `/indicadores/${r.id}`,
  users: r => `/personas/${r.id}`,
};

const rutaDeResultado = (r: { id: string; uuid?: string; type: string; label: string }) =>
  RUTA_DE_TIPO[r.type]?.(r) || `/buscar?q=${encodeURIComponent(r.label)}`;

/** ══ ¿ESTO ES BUSCAR, O ES PREGUNTAR? ═══════════════════════════════════════
 *  (2026-08-22, Eugenio: «haz que en el chat también sea un buscador de
 *  publicaciones relacionadas, y que no tire de IA para cosas que sean
 *  búsquedas de publicaciones internas»).
 *
 *  Devuelve QUÉ hay que buscar, o `null` si esto no es una búsqueda. Nunca
 *  «quizás»: si no está claro, es null y va a la IA. Equivocarse hacia la IA
 *  cuesta unas décimas de céntimo; equivocarse hacia el buscador es contestar
 *  una lista de enlaces a quien preguntaba otra cosa.
 *
 *  SOLO CUANDO EL VERBO LO DICE. «Busca publicaciones sobre el agua» es una
 *  búsqueda; «¿por qué se contamina el agua?» no lo es, aunque las dos hablen
 *  del agua. Lo que decide es el verbo del principio, no las palabras del
 *  tema — que es exactamente el fallo que ya nos costó un documento que nadie
 *  pidió: una palabra suelta del asunto secuestrando la intención.
 *
 *  Y NUNCA CUANDO SE PIDE CREAR ALGO. «Busca un hueco y créame una tarea» no
 *  es una búsqueda de publicaciones. */
const queBuscar = (texto: string): string | null => {
  const t = texto.trim();
  if (t.length < 4 || t.length > 120) return null;
  // Crear, explicar, resumir, comparar… eso es para la IA, diga lo que diga
  // el resto de la frase.
  if (/\b(crea|créa\w*|crear|hazme|haz\s|genera|génera\w*|escribe|redacta|resume|explica|analiza|compara|traduce|calcula)\b/i.test(t)) return null;
  const m = t.match(/^\s*(?:busca(?:me)?|buscar|encuentra|enséñame|ensename|muéstrame|muestrame|dame|lista(?:me)?)\s+(?:las?\s+|los?\s+)?(?:publicaciones?|publis|contenidos?|artículos?|articulos?|páginas?|paginas?)?\s*(?:sobre|de|acerca de|relacionad\w+ con|que hablen de)?\s*(.+)$/i)
    || t.match(/^\s*(?:publicaciones?|contenidos?)\s+(?:sobre|de|acerca de)\s+(.+)$/i)
    || t.match(/^\s*¿?qué\s+hay\s+(?:publicado\s+)?sobre\s+(.+?)\??$/i);
  if (!m) return null;
  const q = m[1].replace(/[?¿.!]+$/, '').trim();
  // Menos de dos letras no es un tema, y el buscador tampoco lo aceptaría.
  return q.length >= 2 ? q : null;
};

/** 23400 → «23 s». Lo que tardó, que es la otra mitad de lo que cuesta algo. */
const segundos = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`);

/** Un botón del muelle. Uno solo para los cuatro: cinco copias del mismo
 *  bloque serían cinco sitios donde arreglar el mismo detalle. El icono es
 *  SIEMPRE el mismo que usa esa sección en el menú lateral — si la misma cosa
 *  lleva dos caras, parecen dos destinos. */
function BotonMuelle({ icono: Icono, label, titulo, onClick, activo }: {
  icono: any; label: string; titulo: string; onClick: () => void; activo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      aria-current={activo ? 'page' : undefined}
      className="h-full flex flex-col items-center justify-center gap-0.5 group"
    >
      {/* DÓNDE ESTÁS, EN NEGRO (2026-08-21, Eugenio: «que se resalte sobre
          fondo negro solo aquel icono donde estés navegando»). Una barra de
          cinco destinos sin marcar cuál es el de ahora obliga a mirar el
          contenido para saber dónde estás. El fondo va SOLO en el icono y no
          en toda la columna: una pastilla del ancho del botón sería una barra
          de cinco cuadrados. */}
      <span className={cn('grid place-items-center rounded-full transition-colors',
        // +25% en el móvil (Eugenio): 22 px de icono en 34 de caja. Por encima
        // de 640 px se queda en el tamaño de antes, donde el ratón apunta solo.
        'w-[34px] h-[34px] sm:w-8 sm:h-8',
        activo ? 'bg-slate-900 text-white' : 'text-slate-500 group-hover:bg-slate-100 group-hover:text-emerald-700')}>
        <Icono className="w-[22px] h-[22px] sm:w-[18px] sm:h-[18px]" />
      </span>
      {/* En pantallas muy estrechas el texto de cinco botones no cabe: se
          queda el icono, que con el `title` sigue diciendo qué es. */}
      <span className={cn('text-[8px] font-bold hidden min-[360px]:block truncate max-w-full px-0.5 leading-none',
        activo ? 'text-slate-900' : 'text-slate-500')}>{label}</span>
    </button>
  );
}

/** LO QUE SE PUEDE CREAR, y adónde lleva cada uno. Son destinos que EXISTEN y
 *  donde esa creación se hace de verdad: comprobado uno a uno antes de
 *  ponerlos, porque un atajo que te deja en una página donde no se puede crear
 *  nada es peor que no tener atajo. */
const HERRAMIENTAS_CREAR: Array<{ label: string; destino: string; icono: any }> = [
  { label: 'Proyecto',    destino: '/proyectos',  icono: FolderKanban },
  { label: 'Tarea',       destino: '/tareas',     icono: ListChecks },
  { label: 'Página',      destino: '/paginas',    icono: FileText },
  { label: 'Esquema',     destino: '/esquemas',   icono: Share2 },
  { label: 'Mapa',        destino: '/mis-mapas',  icono: MapIcon },
  { label: 'Publicación', destino: '/explorar',   icono: Megaphone },
  { label: 'Persona',     destino: '/personas',   icono: Users2 },
  { label: 'Evento',      destino: '/calendario', icono: CalendarDays },
];

/** Modelo de Anthropic o Google disponible para elegir (Fase 12), con precio por 1M tokens en céntimos de €. */
interface AIModelInfo { label: string; hint: string; input: number; output: number; image?: boolean; gratis?: boolean; nivelMinimo?: number; }

/** Un nivel del selector: sencillo, medio, alto, imágenes o vídeos. Lo define
 *  el servidor (`NIVELES_MODELO`) para que el precio que se enseña salga del
 *  mismo catálogo que luego se cobra. */
interface NivelModelo {
  clave: string; label: string; modelo: string | null; para: string; porQueNo?: string;
}

interface PendingAttachment {
  name: string;
  mediaType: string;
  /** Base64 sin el prefijo data:...;base64, */
  data: string;
}

const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';
const ATTACHMENT_MAX_BYTES: Record<string, number> = {
  'image/jpeg': 5 * 1024 * 1024, 'image/png': 5 * 1024 * 1024,
  'image/gif': 5 * 1024 * 1024, 'image/webp': 5 * 1024 * 1024,
  'application/pdf': 15 * 1024 * 1024,
};

export default function AIAssistant({ modo = 'panel' }: {
  /**
   * `panel` — el de siempre: botón flotante + columna acoplada a la derecha.
   * `pagina` — el MISMO chat ocupando toda una página (la herramienta «IA»
   *   del menú, 2026-08-20). No duplica nada: reutiliza `panelBody`, que ya
   *   servía para escritorio y móvil; lo único que cambia es el marco.
   */
  modo?: 'panel' | 'pagina';
} = {}) {
  // UN SOLO ASISTENTE (Eugenio, 2026-08-20: «que sea coherente en todas las
  // herramientas»). Antes había tres formas del mismo chat —panel acoplado,
  // barra abajo en los lienzos y barra en línea en la portada— y cada una se
  // comportaba distinto. Ahora es siempre el panel lateral, con su botón
  // flotante abajo a la derecha. La barra de abajo desaparece: su micro y su
  // «+» viven dentro del panel.
  const mode = 'dock' as const;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Por defecto AUTÓNOMO y con internet: el chat crea lo que se le pide sin
  // pedir confirmación y busca siempre que lo necesite (decisión del usuario,
  // 2026-08-05). Ambos siguen siendo configurables en los ajustes.
  const [editMode, setEditMode] = useState<EditMode>('autonomo');
  const [searchWeb] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<{
    ready: boolean; message: string; models?: Record<string, AIModelInfo>; platformFee?: number;
    /** El tamaño de una petición típica, para estimar el coste de cada modelo
     *  antes de elegirlo. `origen` dice de dónde sale: de tus propias
     *  peticiones, de las de la plataforma, o de un supuesto declarado. */
    tamanoTipico?: { entrada: number; salida: number; origen: 'tuyo' | 'plataforma' | 'supuesto'; n: number };
    niveles?: NivelModelo[];
  } | null>(null);
  // Modelo elegido por el usuario para sus creaciones (Fase 12) — vacío = el de la plataforma.
  const [selectedModel, setSelectedModel] = useState<string>('');
  const esMovil = useEsMovil();
  // ══ EL MUELLE DE ABAJO (2026-08-21, Eugenio: «que crees un menú inferior de
  //    lado a lado donde esté el chat de IA con capacidad de desplegarse hacia
  //    arriba a 1/3 de pantalla […] y ahí tener el historial de chats a un
  //    lado también»). ═════════════════════════════════════════════════════
  //
  // POR QUÉ ABAJO Y DE LADO A LADO: el chat era una columna a la derecha en el
  // escritorio y un cajón a pantalla completa en el móvil — dos maquetas
  // distintas para lo mismo. Abajo es una sola, y es donde la mano ya está en
  // un teléfono.
  //
  // DOS ALTURAS, no un tamaño libre: cerrado es una barra donde escribir sin
  // que tape nada; abierto ocupa un tercio de la pantalla, que es lo que se
  // pidió y lo que deja ver la página de detrás mientras hablas. Se puede
  // arrastrar el borde de arriba para cambiarlo, entre un cuarto y tres
  // cuartos: menos de un cuarto no cabe una respuesta y más de tres cuartos ya
  // es tapar la aplicación, que es lo que veníamos a evitar.
  /** Lo que mide la barra cuando está cerrada. 52 px es una fila tocable con
   *  el pulgar sin robarle sitio a la página. Se bajó de 52 a 46 px
   *  (2026-08-21, Eugenio: «haz más compacto el menú de arriba») — el icono y
   *  su nombre caben igual y la página gana 6 px en cada pantalla. */
  /** 44 px, que en Tailwind es `bottom-11`. Si se cambia uno hay que cambiar
   *  el otro: están atados a mano porque una clase no puede leer una
   *  constante. */
  const ALTO_BARRA = 44;
  /** QUÉ HAY DESPLEGADO: nada, el chat, o el visor de herramientas. Es un
   *  solo estado y no dos banderas, porque los dos paneles ocupan el MISMO
   *  hueco: con dos banderas podrían estar abiertos a la vez y taparse. */
  const [panelMuelle, setPanelMuelle] = useState<null | 'chat' | 'crear'>(null);
  const [alturaMuelle, setAlturaMuelle] = useState(33);   // % de la pantalla
  const [arrastrandoMuelle, setArrastrandoMuelle] = useState(false);
  const [historialALaVista, setHistorialALaVista] = useState(false);
  /** ══ EL HISTORIAL, GUARDADO ══════════════════════════════════════════════
   *  (2026-08-22, Eugenio: «haz que el historial de la chatIA de
   *  conversaciones quede guardado por defecto, y que se despliegue solo si
   *  haces click o hover con el ratón, y se semidespliega mientras mantienes
   *  el hover»).
   *
   *  Ocupaba 208 px fijos de una columna de 420: la mitad del chat gastada en
   *  una lista que se mira una vez cada muchas. Ahora es una tira estrecha; se
   *  asoma al pasar el ratón y se queda si pinchas.
   *
   *  DOS ESTADOS Y NO UNO, a propósito: pasar el ratón ENSEÑA, pinchar FIJA.
   *  Con uno solo, mover el ratón por encima sin querer dejaría la lista
   *  abierta comiéndose el chat, o pinchar no serviría de nada porque se
   *  cerraría al apartar el ratón. */
  const [historialFijo, setHistorialFijo] = useState(false);
  const [historialAsomado, setHistorialAsomado] = useState(false);
  const [modelosAbierto, setModelosAbierto] = useState(false);
  /** El último intento que se rompió antes de llegar al modelo. Va en el
   *  contexto del siguiente mensaje para que la IA sepa que falló. */
  const ultimoFallo = useRef<{ cuando: number; estado: number; motivo: string; peticion: string } | null>(null);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  /** Hay un fichero encima del panel, esperando a que lo sueltes. */
  const [soltando, setSoltando] = useState(false);
  // Modo barra (páginas de Grafos): grafos que coinciden con lo que se escribe.
  const [graphMatches, setGraphMatches] = useState<Array<{ slug: string; title: string; score: number }>>([]);
  // Pop-up central: la publicación real que responde a la pregunta.
  const [popupPub, setPopupPub] = useState<{ publication: any; graphs: any[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // El Juego Vital encarna este asistente en el robot: al «hablarle» al robot,
  // la página lanza este evento y la barra recibe el foco.
  const barInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // El robot del Mundo 3D pide la palabra: se ABRE el panel (antes esto
    // desminimizaba la barra de abajo, que ya no existe).
    const enfocar = () => { setOpen(true); setPanelMuelle('chat'); setTimeout(() => barInputRef.current?.focus(), 60); };
    window.addEventListener('humanity:asistente-focus', enfocar);
    return () => window.removeEventListener('humanity:asistente-focus', enfocar);
  }, []);

  // --- Juego Vital: la página del juego manda aquí el estado del mundo y el
  // agente con el que se habla; cada agente tiene su propio hilo, así que al
  // cambiar de interlocutor se cambia de conversación.
  const [juegoCtx, setJuegoCtx] = useState<any>(null);
  useEffect(() => {
    const alContexto = (e: Event) => {
      const d = (e as CustomEvent).detail || null;
      setJuegoCtx(d);
      const nuevaConv = d?.agente?.conversation_id ?? d?.conversation_id ?? null;
      const idAgente = d?.agente?.id ?? 'robot';
      if (idAgente !== interlocutor.current) {
        interlocutor.current = idAgente;
        setConversationId(nuevaConv);
        setMessages([]);
        if (nuevaConv) cargarConversacion(nuevaConv);
        setOpen(true);
        setPanelMuelle('chat');
      }
    };
    window.addEventListener('humanity:juego-contexto', alContexto);
    return () => window.removeEventListener('humanity:juego-contexto', alContexto);
  }, []);
  const interlocutor = useRef<string | null>(null);
  const { user, updateUiSettings } = useAuth();

  /** ══ EL ANCHO DEL LATERAL, LA MITAD DE LA PANTALLA ═════════════════════
   *  (2026-08-22, Eugenio: «que la ventana de chatIA ocupe el 50% de la
   *  pantalla y se pueda con un selector ensanchar o reducir el ancho»).
   *
   *  Eran 420 px fijos: en un portátil de 1280 eso es un tercio, y en un
   *  monitor de 2560 es una sexta parte —la misma columna estrecha en una
   *  pantalla que sobra por todas partes—. En porcentaje se comporta igual en
   *  las dos, que es lo que uno espera de «la mitad».
   *
   *  SE GUARDA EN TUS AJUSTES, no en el componente: si se olvidara al cerrar,
   *  habría que recolocarlo cada vez, y entonces el selector molesta más de lo
   *  que sirve. */
  const anchoGuardado = (user as any)?.uiSettings?.anchoChatIA;
  const [anchoPct, setAnchoPct] = useState<number>(
    typeof anchoGuardado === 'number' ? anchoGuardado : 50);
  useEffect(() => {
    if (typeof anchoGuardado === 'number' && anchoGuardado !== anchoPct) setAnchoPct(anchoGuardado);
    // Solo cuando llega el usuario: después manda lo que estés arrastrando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchoGuardado]);
  /** Los píxeles que toca hoy. Con un mínimo de 320: por debajo, una respuesta
   *  con una tabla de tres columnas se parte y deja de leerse. */
  const [anchoVentana, setAnchoVentana] = useState(() => window.innerWidth);
  useEffect(() => {
    const alRedimensionar = () => setAnchoVentana(window.innerWidth);
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);
  const anchoLateral = Math.max(320, Math.round(anchoVentana * (anchoPct / 100)));
  /** Cambiar el ancho y recordarlo. Se guarda al SOLTAR, no en cada píxel. */
  const guardarAncho = (pct: number) => {
    const v = Math.min(80, Math.max(25, Math.round(pct)));
    setAnchoPct(v);
    if (user) updateUiSettings({ anchoChatIA: v }).catch(() => {});
  };
  // Los territorios que la app ya tiene cargados, para comprobar que un
  // destino existe antes de navegar (B63). Si aún no han llegado, no se
  // bloquea nada: mejor dejar pasar que impedir algo que sí existe.
  const { territories: territorios } = useData();

  // HISTORIAL (Eugenio, 2026-08-20: «con historial de conversaciones»). La
  // ruta ya existía y no la usaba nadie: lo que faltaba era el sitio donde
  // enseñarlo. Se pide al abrir el cajón y después de cada respuesta, para
  // que la conversación de ahora aparezca en la lista con su título.
  const [historial, setHistorial] = useState<Array<{ id: string; title: string | null; message_count: number; updated_at: string }>>([]);
  const cargarHistorial = useCallback(() => {
    if (!user) { setHistorial([]); return; }
    fetch('/api/ai/conversations', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setHistorial(Array.isArray(j) ? j : []))
      .catch(() => setHistorial([]));
  }, [user]);
  useEffect(() => { if (open) cargarHistorial(); }, [open, cargarHistorial]);

  const olvidarConversacion = async (id: string) => {
    setHistorial(h => h.filter(c => c.id !== id));
    await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null);
    // Si era la abierta, se empieza una en blanco: quedarse dentro de algo que
    // ya no está en el historial es la forma más rápida de perder un mensaje.
    if (id === conversationId) { setConversationId(null); setMessages([]); }
  };
  /** Con quién hablas ahora mismo, en la cabecera del panel. */
  const tituloInterlocutor = juegoCtx?.agente?.nombre
    || (juegoCtx ? 'Tu robot' : 'Asistente de Conocimiento');

  /** Carga los mensajes de una conversación existente (hilo por agente y listado lateral). */
  const cargarConversacion = async (id: string) => {
    try {
      const filas = await fetch(`/api/ai/conversations/${id}/messages`, { credentials: 'include' }).then(r => r.json());
      if (!Array.isArray(filas)) return;
      setConversationId(id);
      setMessages(filas.map((m: any) => ({ role: m.role, content: m.content })));
    } catch { /* si falla, se sigue con el hilo vacío */ }
  };
  // Dictado por voz: al hablar, se transcribe directamente en el cuadro de texto.
  const dictationBase = useRef('');
  const { listening, supported: voiceSupported, toggle: toggleVoice } = useVoiceDictation((text, isFinal) => {
    const sep = dictationBase.current && !dictationBase.current.endsWith(' ') ? ' ' : '';
    setInput(dictationBase.current + sep + text);
    if (isFinal) dictationBase.current = dictationBase.current + sep + text;
  });
  const handleMicClick = () => {
    if (!listening) dictationBase.current = input;
    toggleVoice();
  };

  const location = useLocation();
  /** La ruta de ahora, para marcar en negro el botón donde estás. */
  const ruta = location.pathname;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { width, startResize, dragging } = usePanelWidth('ai_assistant', 20, { min: 18, max: 45 });
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : true
  ));
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prefill desde otras páginas (p. ej. el nodo «Crear tu mapa» de /mapas):
  // rellena el cuadro y abre el asistente listo para completar la petición.
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const text = (e as CustomEvent).detail;
      if (typeof text === 'string') { setInput(text); setOpen(true); setPanelMuelle('chat'); }
    };
    window.addEventListener('ai:prefill', onPrefill);
    return () => window.removeEventListener('ai:prefill', onPrefill);
  }, []);

  // Abrir desde fuera SIN escribir nada. Lo usa el botón de la barra en el
  // teléfono (B91): el mismo asistente, otra puerta de entrada.
  useEffect(() => {
    const abrir = () => { setOpen(true); setPanelMuelle('chat'); };
    window.addEventListener('ai:abrir', abrir);
    return () => window.removeEventListener('ai:abrir', abrir);
  }, []);

  useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // Fast-path del buscador de grafos: al escribir en la barra, se consultan
  // los grafos publicados que coinciden (sin gastar una llamada a la IA).
  useEffect(() => {
    if (mode === 'dock') return;
    const q = input.trim();
    if (q.length < 3) { setGraphMatches([]); return; }
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    resolveTimer.current = setTimeout(() => {
      fetch(`/api/graphs/resolve?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(json => setGraphMatches(Array.isArray(json.matches) ? json.matches : []))
        .catch(() => setGraphMatches([]));
    }, 250);
    return () => { if (resolveTimer.current) clearTimeout(resolveTimer.current); };
  }, [input, mode]);

  /** Estado visual actual, tomado de la URL: es lo que ve el usuario ahora. */
  // QUÉ ESTÁS MIRANDO (Eugenio, 2026-08-20: «que la IA vea en la página que
  // estás»). El escritorio publica sus ventanas y la web abierta en el
  // navegador; aquí solo se escucha. Con las ventanas, «la página en la que
  // estás» ya no es la ruta de fondo: es la ventana de delante.
  const [ventanas, setVentanas] = useState<Array<{ titulo: string; destino: string; delante: boolean; minimizada: boolean }>>([]);
  const [paginaWeb, setPaginaWeb] = useState<string | null>(null);
  useEffect(() => {
    const alVentanas = (e: Event) => setVentanas(((e as CustomEvent).detail as any[]) || []);
    const alWeb = (e: Event) => setPaginaWeb(((e as CustomEvent).detail as string) || null);
    window.addEventListener('humanity:ventanas', alVentanas);
    window.addEventListener('humanity:pagina-web', alWeb);
    pedirVentanas();
    return () => {
      window.removeEventListener('humanity:ventanas', alVentanas);
      window.removeEventListener('humanity:pagina-web', alWeb);
    };
  }, []);
  const ventanaDelante = ventanas.find(v => v.delante) || null;
  /** El nombre de una ruta en cristiano. Enseñar «/personas/U_ADMIN_EUGENIO»
   *  a quien no programa no dice nada. Lo que no esté aquí cae a un nombre
   *  hecho con el primer tramo de la dirección, que casi siempre acierta. */
  const nombreDeRuta = (ruta: string) => {
    const fijas: Record<string, string> = {
      '/': 'Tu perfil', '/esquemas': 'Grafos', '/mapas': 'Mapas', '/juego': 'Mundo 3D',
      '/proyectos': 'Mis proyectos', '/archivos': 'Archivos', '/explorar': 'Explorar',
      '/mercado': 'Mercado', '/configuracion': 'Configuración', '/vision': 'Visión y hoja de ruta',
    };
    if (fijas[ruta]) return fijas[ruta];
    if (ruta.startsWith('/personas/')) return 'Un perfil';
    if (ruta.startsWith('/esquemas/')) return 'Un grafo';
    if (ruta.startsWith('/proyectos/')) return 'Un proyecto';
    if (ruta.startsWith('/mapas/')) return 'Un mapa';
    const primero = ruta.split('/')[1] || '';
    return primero ? primero[0].toUpperCase() + primero.slice(1) : 'La portada';
  };
  /** Lo que se enseña en el panel: dónde cree la IA que estás. */
  const dondeEstoy = juegoCtx
    ? (juegoCtx?.agente?.nombre ? `Hablando con ${juegoCtx.agente.nombre}` : 'En el Mundo 3D')
    : ventanaDelante
      ? (ventanaDelante.destino.startsWith('about:') || paginaWeb
        ? `Navegador · ${(paginaWeb || '').replace(/^https?:\/\//, '').split('/')[0] || 'inicio'}`
        : ventanaDelante.titulo)
      : nombreDeRuta(location.pathname);

  /** El modelo que se está usando, dicho en la cabecera y no escondido en los
   *  ajustes (Eugenio, 2026-08-20: «que se sepa qué modelo usa»). */
  /** El nombre que enseña el botón. En «Automático» dice además con cuál
   *  contestó el último mensaje: eso es «el modelo que está utilizando», que
   *  es justo lo que Eugenio pidió ver — con el router, cambia por mensaje. */
  const modeloActual = (() => {
    // El nombre del NIVEL, que es el que se eligió, y no el del modelo que
    // hay detrás: elegiste «medio», no «abierto-medio».
    if (selectedModel) {
      const nivel = (status?.niveles || []).find(n => n.modelo === selectedModel);
      if (nivel) return nivel.label.replace(/^Modelo /, '');
      if (status?.models?.[selectedModel]) return status.models[selectedModel].label;
    }
    const ultimo = [...messages].reverse().find(m => m.usage?.model)?.usage?.model;
    if (!ultimo) return 'automático';
    // El modelo por defecto de la plataforma (claude-sonnet-4-6) no está en el
    // catálogo elegible, así que no tiene etiqueta: se enseña su id tal cual
    // antes que callarse cuál respondió, que es justo lo que se pidió ver.
    const entrada = Object.entries(status?.models || {}).find(([id]) => ultimo.startsWith(id));
    return `automático · ${entrada ? entrada[1].label : ultimo}`;
  })();

  // Cerrar el desplegable de modelos al pinchar en cualquier otro sitio.
  useEffect(() => {
    if (!modelosAbierto) return;
    const fuera = () => setModelosAbierto(false);
    window.addEventListener('click', fuera);
    return () => window.removeEventListener('click', fuera);
  }, [modelosAbierto]);

  const currentContext = () => ({
    // Lo que se rompió en el último intento, si fue hace poco. Es lo único
    // que la IA no puede saber por su cuenta: pasó en el navegador.
    ultimoFallo: ultimoFallo.current && Date.now() - ultimoFallo.current.cuando < 10 * 60_000
      ? ultimoFallo.current : undefined,
    route: location.pathname,
    // Lo que de verdad tienes delante, que con ventanas ya no es la ruta.
    mirando: dondeEstoy,
    ventanas: ventanas.filter(v => !v.minimizada).map(v => ({ titulo: v.titulo, destino: v.destino, delante: v.delante })),
    paginaWeb: paginaWeb || undefined,
    territorio: searchParams.get('territorio'),
    nivel: searchParams.get('nivel'),
    entidadSeleccionada: searchParams.get('id'),
    usuario: user ? { id: user.id, nivel: user.roleLevel, rol: user.roleLabel } : null,
    // Juego Vital: cuando el jugador habla con su robot o con un agente, la
    // página nos manda el estado del mundo y con quién está hablando. Sin
    // esto el modelo respondía como el asistente genérico de la plataforma.
    juego: juegoCtx || undefined,
  });

  /**
   * Aplica los eventos de interfaz que devuelve el modelo.
   *
   * SE COMPRUEBA QUE EL DESTINO EXISTA ANTES DE IR (2026-08-20, B63). Antes
   * se navegaba a ciegas con el identificador que llegara: si el modelo se
   * equivocaba, acababas en un mapa vacío y NADIE decía nada. Hoy el modelo
   * acierta —probado con un id inventado, se negó él solo— pero eso es tener
   * suerte, no estar protegido: un fallo que depende de que el modelo acierte
   * está aplazado, no arreglado.
   *
   * Es la segunda mitad de la regla de este módulo: no basta con tener sitio
   * donde guardar las cosas, hace falta una forma de decir que no se puede.
   */
  const applyUiEvents = (events: any[]) => {
    const noSePudo = (que: string) => {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `No he podido llevarte ahí: ${que} no existe en la plataforma.`,
        error: true,
      }]);
    };

    for (const e of events || []) {
      const p = e.params || {};
      switch (e.type) {
        case 'OPEN_TERRITORY':
        case 'ZOOM_TO_TERRITORY': {
          const t = String(p.territorySlug || p.territoryId || '');
          // Se valida contra los territorios que la app YA tiene cargados: no
          // hace falta preguntar al servidor para saber que algo no está.
          if (!t) { noSePudo('ese territorio'); break; }
          const existe = !territorios.length || territorios.some((x: any) =>
            x.slug === t || x.id === t || String(x.name || '').toLowerCase() === t.toLowerCase());
          if (!existe) { noSePudo(`el territorio «${t}»`); break; }
          navigate(`/mapa?territorio=${encodeURIComponent(t)}`);
          break;
        }
        case 'FILTER_OBJECTIVE':
          navigate(`/mapa?territorio=${searchParams.get('territorio') || 'espana'}&nivel=objetivo&id=${p.objectiveId}`);
          break;
        case 'SELECT_INDICATOR':
          navigate(`/mapa?territorio=${searchParams.get('territorio') || 'espana'}&nivel=indicador&id=${p.indicatorId}`);
          break;
        case 'SELECT_MARKER':
          navigate(`/mapa?territorio=${searchParams.get('territorio') || 'espana'}&nivel=marcador&id=${p.markerId}`);
          break;
        case 'SELECT_METRIC':
          navigate(`/mapa?territorio=${searchParams.get('territorio') || 'espana'}&nivel=metrica&id=${p.metricId}`);
          break;
        case 'OPEN_CHALLENGE':
          if (p.slug || p.challengeId) navigate(`/retos/${p.slug || p.challengeId}`); else noSePudo('ese reto');
          break;
        case 'OPEN_SOLUTION':
          if (p.slug || p.solutionId) navigate(`/soluciones/${p.slug || p.solutionId}`); else noSePudo('esa solución');
          break;
        case 'SHOW_MARKET':    navigate('/mercado'); break;
        case 'SHOW_INITIATIVES': navigate('/iniciativas'); break;
        case 'OPEN_KNOWLEDGE_GRAPH':
          if (p.slug || p.graphId) navigate(`/esquemas/${p.slug || p.graphId}`); else noSePudo('ese esquema');
          break;
        case 'OPEN_USER_MAP':
          if (p.slug || p.mapId) navigate(`/mapas/${p.slug || p.mapId}`); else noSePudo('ese mapa');
          break;
        default: break;
      }
    }
  };

  const handleFileSelect = (file: File | undefined) => {
    setAttachError(null);
    if (!file) return;
    const maxBytes = ATTACHMENT_MAX_BYTES[file.type];
    if (!maxBytes) {
      setAttachError('Solo se admiten imágenes (JPG, PNG, GIF, WEBP) o PDF.');
      return;
    }
    if (file.size > maxBytes) {
      setAttachError(`El archivo pesa demasiado (máximo ${Math.round(maxBytes / (1024 * 1024))} MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const data = result.slice(result.indexOf(',') + 1); // quita el prefijo data:...;base64,
      setAttachment({ name: file.name, mediaType: file.type, data });
    };
    reader.onerror = () => setAttachError('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  };

  // ══ ARRASTRAR UN FICHERO AL CHAT (2026-08-21, petición de Eugenio: «haz que
  // al arrastrar un archivo pdf al chatbot se adjunte») ══════════════════════
  //
  // Adjuntar YA FUNCIONABA: el clip de abajo acepta imágenes y PDF hasta 15 MB
  // y `handleFileSelect` hace la validación, la lectura y el aviso de error.
  // Lo único que faltaba era el GESTO. Por eso esto no valida nada por su
  // cuenta y se limita a entregarle el fichero a esa misma función: si algún
  // día cambia lo que se admite, cambia en un sitio y aquí no hay nada que
  // tocar. Y por eso también se aceptan imágenes además de PDF — es lo mismo
  // que ya acepta el clip, y rechazar por aquí lo que el clip admite sería
  // una incoherencia que el usuario notaría antes que nosotros.
  //
  // `types.includes('Files')` es lo que distingue arrastrar un FICHERO de
  // arrastrar texto seleccionado o un enlace, que en un chat pasa a menudo y
  // no debe encender la zona de soltar.
  const traeFicheros = (e: React.DragEvent) => e.dataTransfer?.types?.includes('Files');

  // El contador es la parte fea y necesaria: `dragleave` salta también al
  // pasar de un hijo a otro DENTRO del panel, así que sin contar entradas y
  // salidas el aviso parpadea mientras mueves el fichero por encima.
  const profundidadArrastre = useRef(0);

  const zonaSoltar = {
    onDragEnter: (e: React.DragEvent) => {
      if (!traeFicheros(e)) return;
      e.preventDefault();
      profundidadArrastre.current += 1;
      setSoltando(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!traeFicheros(e)) return;
      // Sin este `preventDefault` el navegador se queda el fichero y ABRE EL
      // PDF en la pestaña, tirando la conversación por el camino.
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!traeFicheros(e)) return;
      profundidadArrastre.current = Math.max(0, profundidadArrastre.current - 1);
      if (profundidadArrastre.current === 0) setSoltando(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!traeFicheros(e)) return;
      e.preventDefault();
      profundidadArrastre.current = 0;
      setSoltando(false);
      // Solo el primero: el adjunto del chat es uno, no una lista. Soltar
      // cinco y quedarse con uno en silencio sería mentir, así que se dice.
      const ficheros = Array.from(e.dataTransfer.files || []);
      if (!ficheros.length) return;
      handleFileSelect(ficheros[0]);
      if (ficheros.length > 1) {
        setAttachError(`Solo se puede adjuntar un archivo por mensaje: se ha cogido «${ficheros[0].name}».`);
      }
    },
  };

  /** El aviso que se pinta encima del panel mientras traes un fichero. */
  const avisoSoltar = soltando ? (
    <div className="absolute inset-0 z-50 pointer-events-none grid place-items-center bg-emerald-50/90 border-2 border-dashed border-emerald-400 rounded-lg">
      <div className="flex flex-col items-center gap-2 text-emerald-700">
        <Paperclip className="w-7 h-7" />
        <p className="text-sm font-black">Suelta para adjuntarlo</p>
        <p className="text-[11px] font-bold text-emerald-600">PDF hasta 15 MB · imágenes hasta 5 MB</p>
      </div>
    </div>
  ) : null;

  const send = async (overrideText?: string) => {
    const text = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!text || busy) return;
    const pendingAttachment = attachment;
    setInput('');
    setAttachment(null);
    setGraphMatches([]);
    setMessages(m => [...m, { role: 'user', content: text, attachmentName: pendingAttachment?.name }]);
    setBusy(true);
    try {
      // ══ BUSCAR NO GASTA IA ═══════════════════════════════════════════════
      // (2026-08-22, Eugenio: «que no tire de IA para cosas que sean
      // búsquedas de publicaciones internas»).
      //
      // «Busca publicaciones sobre el agua» tiene una respuesta exacta en la
      // base de datos, y pasarla por un modelo la empeora dos veces: cuesta
      // dinero y devuelve una redacción sobre unos resultados en vez de los
      // resultados. Aquí se contesta con lo que hay publicado, con sus
      // enlaces, y se dice que no ha hecho falta la IA.
      //
      // SI NO HAY NADA, SE DICE QUE NO HAY NADA y se ofrece preguntárselo a la
      // IA. Cero resultados es una respuesta —«esto no está publicado»— y
      // disfrazarla de conversación sería lo de siempre: no poder distinguir
      // «no existe» de «no lo he encontrado».
      const busqueda = queBuscar(text);
      if (busqueda) {
        const r = await fetch(`/api/search?q=${encodeURIComponent(busqueda)}&limit=8`, { credentials: 'include' });
        const j = await r.json();
        const todos: any[] = Array.isArray(j?.results) ? j.results : [];
        const pubs = todos.filter(x => x.type === 'publications');
        // Las publicaciones primero, que es lo que se ha pedido; lo demás
        // detrás, porque buscar «agua» y que no salga el reto del agua sería
        // esconder lo que sí hay.
        const orden = [...pubs, ...todos.filter(x => x.type !== 'publications')].slice(0, 8);
        setMessages(m => [...m, {
          role: 'assistant',
          content: orden.length
            ? `Esto es lo que hay publicado sobre «${busqueda}».`
            : `No hay nada publicado sobre «${busqueda}». Puedes preguntárselo a la IA si quieres que te lo explique ella.`,
          resultados: orden.length ? orden : undefined,
          // El botón para insistir: buscar es lo primero, pero no puede ser lo
          // único, o una pregunta mal empezada se quedaría sin respuesta.
          reintentarIA: text,
        }]);
        setBusy(false);
        return;
      }

      // Fast-path (modo barra), en este orden (petición del usuario):
      // 1º una PREGUNTA que coincide con una publicación existente abre esa
      //    publicación en un pop-up central (la plataforma responde con su
      //    conocimiento real, no generando texto nuevo);
      // 2º un TEMA que coincide con un grafo publicado lo abre directamente.
      // Ninguno de los dos gasta una llamada a la IA.
      // EXCEPCIÓN: si el mensaje pide CREAR algo («crea un grafo de…»), el
      // fast-path no debe secuestrar la intención abriendo un grafo parecido —
      // va directo a la IA, que sabe ejecutar CREATE_KNOWLEDGE_GRAPH/CREATE_MAP.
      const wantsToCreate = /\b(crea|créa\w*|creame|crear|hazme?|genera\w*|génera\w*|constru\w+|nuevo\s+(grafo|mapa)|nueva\s+ventana)\b/i.test(text);

      // Documento pedido al chat (2026-08-08): «hazme un informe de…»,
      // «dámelo en forma de documento»… no se responde con texto en la
      // burbuja: se abre /paginas/nuevo y el documento se ve escribirse en
      // directo, quedando guardado en las publicaciones de quien lo pidió.
      // SI DICES QUÉ QUIERES, MANDA LO QUE DICES (2026-08-20). «Crea una
      // TAREA … del dossier de prensa» se convertía en un DOCUMENTO: la
      // palabra «dossier» disparaba esta rama y se llevaba la petición antes
      // siquiera de llegar a la IA. Se pidió una tarea con todas las letras y
      // salió una página que nadie quería, en la petición más cara de la
      // tanda.
      //
      // Nombrar el artefacto es una instrucción; el contenido es solo tema. Si
      // dices «una tarea», «un mapa», «un proyecto» o «una página», eso gana a
      // cualquier palabra suelta del asunto.
      const pideOtraCosa = /\b(una?\s+)?(tarea|tarjeta|mapa|proyecto|esquema|grafo|evento|cita|recordatorio)\b/i.test(text);
      const pideDocumento =
        !pideOtraCosa &&
        /\b(documento|informe|acta|art[ií]culo|memoria|dossier|redacci[oó]n)\b/i.test(text) &&
        (wantsToCreate || /\b(dame|d[áa]melo|en forma de|como (un )?documento|convi[eé]rte\w*|p[áa]salo|redacta)\b/i.test(text));
      if (pideDocumento && user && !pendingAttachment) {
        setMessages(m => [...m, {
          role: 'assistant',
          content: 'Abriendo el documento — lo verás escribirse en directo. Quedará guardado en tus publicaciones como borrador privado.',
        }]);
        navigate(`/paginas/nuevo?prompt=${encodeURIComponent(text)}${conversationId ? `&conv=${conversationId}` : ''}`);
        return;
      }

      if (mode !== 'dock' && !pendingAttachment && !wantsToCreate) {
        try {
          const [gr, pr] = await Promise.all([
            fetch(`/api/graphs/resolve?q=${encodeURIComponent(text)}`).then(r => r.json()),
            fetch(`/api/publications/resolve?q=${encodeURIComponent(text)}`).then(r => r.json()),
          ]);
          const g = gr.confident && gr.matches?.[0]?.slug ? gr.matches[0] : null;
          const p = pr.confident && pr.matches?.[0]?.publication ? pr.matches[0] : null;
          const isQuestion = text.includes('?') || /\bes cierto\b/i.test(text);
          if (p && (isQuestion || !g || p.score > g.score)) {
            setMessages(m => [...m, { role: 'assistant', content: `Esto es lo más relevante que hay publicado sobre tu pregunta: «${p.publication.title || 'publicación'}» de ${p.publication.author_name || 'la comunidad'}.` }]);
            setPopupPub(p);
            return;
          }
          if (g) {
            setMessages(m => [...m, { role: 'assistant', content: `Abriendo el grafo de conocimiento «${g.title}».` }]);
            navigate(`/esquemas/${g.slug}`);
            return;
          }
        } catch { /* si falla la resolución, se sigue con la IA */ }
      }
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          context: currentContext(),
          edit_mode: editMode,
          search_web: searchWeb,
          model: selectedModel || undefined,
          attachment: pendingAttachment
            ? { name: pendingAttachment.name, media_type: pendingAttachment.mediaType, data: pendingAttachment.data }
            : undefined,
        }),
      });
      // NUNCA SE LEE LA RESPUESTA A CIEGAS (arreglado 2026-08-20, Eugenio:
      // «fallo al pedirle algo simple al chatbot»). El servidor no siempre
      // contesta JSON: un cuerpo demasiado grande da un 413 con una página
      // HTML, y un servidor reiniciándose da un 502 del proxy. Al hacer
      // `res.json()` sin mirar, eso reventaba con «Unexpected token '<'» —
      // un error de programador puesto delante de una persona.
      const crudo = await res.text();
      let json: any = null;
      try { json = crudo ? JSON.parse(crudo) : null; } catch { /* no era JSON */ }

      if (!res.ok || !json) {
        const motivo = json?.error
          || (res.status === 413 ? 'El mensaje llevaba demasiada información adjunta. Prueba a cerrar alguna ventana o a quitar el adjunto.'
            : res.status === 401 ? 'Tu sesión ha caducado: vuelve a entrar.'
            : res.status === 503 ? 'El asistente está apagado ahora mismo.'
            : res.status >= 500 ? `El servidor no ha podido responder (error ${res.status}). Inténtalo otra vez.`
            : `No se ha podido responder (error ${res.status}).`);
        setMessages(m => [...m, { role: 'assistant', content: motivo, error: true }]);
        // Y QUE LA IA SE ENTERE (Eugenio: «lo preocupante es que no sabe ni
        // que ha fallado»). El fallo ocurre AQUÍ, en el navegador, así que el
        // modelo no lo ve por ningún lado: si luego le preguntas «¿qué fallo
        // has tenido?», contesta con toda la razón que no le consta nada.
        // Se apunta, y viaja en el contexto del siguiente mensaje.
        ultimoFallo.current = { cuando: Date.now(), estado: res.status, motivo, peticion: text.slice(0, 200) };
        return;
      }
      setConversationId(json.conversation_id);
      cargarHistorial();
      // Juego Vital: el hilo pertenece al agente con el que se habla, y lo que
      // la IA propone crear (personas, proyectos) lo construye la página
      // llamando al backend con sus comprobaciones de rol.
      if (juegoCtx) {
        window.dispatchEvent(new CustomEvent('humanity:juego-respuesta', {
          detail: { conversation_id: json.conversation_id, acciones: json.acciones_juego || [] },
        }));
      }
      setMessages(m => [...m, {
        role: 'assistant',
        content: json.reply,
        sources: json.sources,
        actions: json.proposed_actions,
        question: json.question || undefined,
        usage: json.usage ? {
          model: json.usage.model,
          totalCents: json.usage.totalCents,
          // Se copian tal cual: si el servidor no los mandó, quedan sin
          // definir y abajo se dice «coste no registrado» en vez de un 0.
          costCents: typeof json.usage.costCents === 'number' ? json.usage.costCents : undefined,
          durationMs: typeof json.usage.durationMs === 'number' ? json.usage.durationMs : undefined,
        } : undefined,
        aviso: json.aviso_modelo || undefined,
        imageUrl: json.imageUrl || undefined,
      }]);
      applyUiEvents(json.ui_events);

      // Modo AUTÓNOMO: las acciones permitidas se ejecutan solas (sin botones
      // de confirmación) y, si crean un grafo o un mapa, se abre directamente.
      const creado: Array<{ titulo: string; url: string }> = [];
      for (const a of json.proposed_actions || []) {
        if (!a.autoApply || a.status !== 'propuesta') continue;
        const rj = await decideAction(a.id, 'aceptar', -1);
        if (rj?.enseñar) creado.push(rj.enseñar);
        // El servidor puede tener algo que contar aunque la acción saliera
        // bien: «esa etiqueta no existe, la he dejado en otra». Si no se
        // enseña, la persona se queda con lo que dijo el modelo, que es lo
        // que PIDIÓ y no lo que pasó.
        if (rj?.aviso) {
          setMessages(m => [...m, { role: 'assistant', content: rj.aviso, aviso: rj.aviso }]);
        }
        if (rj?.ok && rj.slug && rj.entityType === 'knowledge_graphs') {
          setMessages(m => [...m, { role: 'assistant', content: `He creado el grafo como borrador y lo estoy abriendo — revísalo y publícalo cuando quieras.` }]);
          navigate(`/esquemas/${rj.slug}`);
        } else if (rj?.ok && rj.slug && rj.entityType === 'user_maps') {
          setMessages(m => [...m, { role: 'assistant', content: `He creado tu mapa y lo estoy abriendo.` }]);
          navigate(`/mapas/${rj.slug}`);
        } else if (rj && rj.ok === false && rj.error) {
          setMessages(m => [...m, { role: 'assistant', content: rj.error, error: true }]);
        }
      }
      // La prueba de que existe, con su enlace. Va colgada del último mensaje,
      // que es el que acaba de decir que lo había hecho.
      if (creado.length) {
        setMessages(m => m.map((x, i) => (i === m.length - 1 ? { ...x, creado } : x)));
      }
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: e.message || 'Error de red.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  /** msgIndex -1 = el último mensaje (el que se acaba de añadir). */
  const decideAction = async (actionId: number, decision: 'aceptar' | 'rechazar', msgIndex: number): Promise<any> => {
    try {
      const res = await fetch(`/api/ai/actions/${actionId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      setMessages(m => m.map((msg, i) => (msgIndex === -1 ? i !== m.length - 1 : i !== msgIndex) ? msg : {
        ...msg,
        actions: (msg.actions || []).map((a: any) =>
          a.id === actionId ? { ...a, status: json.ok === false ? 'fallida' : (decision === 'aceptar' ? 'ejecutada' : 'rechazada'), error: json.error } : a),
      }));
      return json;
    } catch { return null; /* el estado se queda como estaba */ }
  };

  /** Responder a una pregunta con opciones: marca la pregunta como
   *  respondida y envía la opción elegida como mensaje del usuario. */
  const answerQuestion = (msgIndex: number, option: string) => {
    setMessages(m => m.map((msg, i) => i === msgIndex && msg.question
      ? { ...msg, question: { ...msg.question, answered: true } }
      : msg));
    send(option);
  };

  const newConversation = () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
  };

  // Hilo de conversación (estado vacío + mensajes + indicador), compartido
  // por el panel acoplado y por el modo barra de las páginas de Grafos.
  const conversationInner = (
    <>
            {messages.length === 0 && (
              <div className="text-center py-10">
                <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-4">Pregúntame sobre cualquier cosa de la plataforma.</p>
                <div className="space-y-1.5 text-left">
                  {[
                    'Ceuta frontera amenaza',
                    'Muéstrame los retos del agua en Madrid',
                    '¿Qué productos ayudan con los nitratos?',
                    'Llévame al municipio de Talamanca',
                    '¿Qué iniciativas han mejorado indicadores?',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  m.role === 'user' ? 'bg-emerald-600 text-white whitespace-pre-wrap'
                    : m.error ? 'bg-amber-50 text-amber-800 border border-amber-200 whitespace-pre-wrap'
                    : 'bg-slate-100 text-slate-800')}>
                  {m.attachmentName && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white/20 px-1.5 py-0.5 rounded mb-1">
                      <Paperclip className="w-2.5 h-2.5" /> {m.attachmentName}
                    </span>
                  )}
                  {m.attachmentName && <br />}
                  {/* LO QUE ESCRIBE LA IA SE PINTA; lo que escribes TÚ, no.
                      Tu mensaje es tuyo tal cual: si escribes un asterisco es
                      un asterisco, no una cursiva. Interpretar el texto del
                      usuario sería cambiarle lo que ha dicho. */}
                  {m.role === 'assistant' && !m.error
                    ? <Markdown texto={m.content} />
                    : m.content}

                  {/* Imagen generada por Nano Banana */}
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="Imagen generada por IA"
                      className="mt-2 rounded-xl max-w-full border border-slate-200"
                    />
                  )}

                  {/* Origen de la información: plataforma vs internet */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {m.sources.some(s => s.origin === 'plataforma') && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            <Database className="w-2.5 h-2.5" />
                            {m.sources.filter(s => s.origin === 'plataforma').length} de la plataforma
                          </span>
                        )}
                        {m.sources.some(s => s.origin === 'internet') && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                            <Globe className="w-2.5 h-2.5" />
                            {m.sources.filter(s => s.origin === 'internet').length} de internet
                          </span>
                        )}
                      </div>
                      {/* Enlaces reales citados por la búsqueda web, cuando la hubo. */}
                      {m.sources.filter(s => s.origin === 'internet' && s.url).map((s, i) => (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] text-sky-700 hover:underline truncate"
                          title={s.url}
                        >
                          <Globe className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{s.title || s.url}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Pregunta con opciones (estilo Claude Code): 1 / 2 / … / Otro */}
                  {m.question && (
                    <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3">
                      <p className="text-[11px] font-bold text-slate-800 mb-2">{m.question.text}</p>
                      <div className="flex flex-col gap-1.5">
                        {m.question.options.map((opt, oi) => (
                          <button
                            key={oi}
                            disabled={busy || m.question!.answered}
                            onClick={() => answerQuestion(i, opt)}
                            className="flex items-center gap-2 text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          >
                            <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">{oi + 1}</span>
                            {opt}
                          </button>
                        ))}
                        <button
                          disabled={busy || m.question.answered}
                          onClick={() => setMessages(msgs => msgs.map((mm, mi) => mi === i && mm.question ? { ...mm, question: { ...mm.question, answered: true } } : mm))}
                          className="flex items-center gap-2 text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 transition-colors disabled:opacity-50"
                        >
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[9px] font-black flex items-center justify-center shrink-0">…</span>
                          Otro — escríbelo abajo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Acciones propuestas: Sí / No */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.actions.map((a: any) => (
                        <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-2.5">
                          {/* QUÉ, no solo qué CLASE de operación (2026-08-20).
                              Decía «Crear una tarea en un proyecto» y el
                              motivo, que es el registro de la acción, no la
                              cosa: sin el título ni el proyecto no se puede
                              distinguir de un vistazo qué se ha hecho. */}
                          <p className="text-[11px] font-bold text-slate-800">
                            {a.params?.titulo || a.params?.nombre || a.params?.title || a.description || a.action_type}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {a.description || a.action_type}
                            {a.params?.proyecto ? ` · ${a.params.proyecto}` : ''}
                          </p>
                          {a.rationale && <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{a.rationale}</p>}
                          {!a.allowed && (
                            <p className="text-[10px] text-amber-700 mt-1">Requiere nivel {a.requiredLevel}. Tu nivel no alcanza.</p>
                          )}
                          {a.allowed && a.status === 'propuesta' && (
                            <div className="flex gap-1.5 mt-2">
                              <button onClick={() => decideAction(a.id, 'aceptar', i)} className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                                <Check className="w-3 h-3" /> Sí, aplícalo
                              </button>
                              <button onClick={() => decideAction(a.id, 'rechazar', i)} className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors">
                                <Ban className="w-3 h-3" /> No
                              </button>
                            </div>
                          )}
                          {a.status && a.status !== 'propuesta' && (
                            <p className={cn('text-[10px] font-bold mt-1.5 uppercase tracking-wide',
                              a.status === 'ejecutada' ? 'text-emerald-600' : a.status === 'fallida' ? 'text-red-600' : 'text-slate-400')}>
                              {a.status}{a.error ? `: ${a.error}` : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* El router no dio lo pedido (sin nivel, tope agotado…):
                      se dice donde se ve, no en una consola. */}
                  {/* LO QUE SE HA CREADO, CON SU ENLACE (2026-08-20). Es la
                      prueba: si la IA dice «ya está» y aquí no aparece nada,
                      es que no hay nada. Antes solo quedaba la palabra del
                      modelo, y llegó a afirmar tareas que no existían. */}
                  {/* ══ LO QUE HA ENCONTRADO EL BUSCADOR ══════════════════
                      (2026-08-22, Eugenio: «haz que el chat también sea un
                      buscador de publicaciones relacionadas»).

                      Enlaces de verdad, no una redacción sobre ellos: lo que
                      se busca al buscar es llegar, y una lista que se pueda
                      abrir en otra pestaña llega antes que un párrafo que los
                      describe. */}
                  {!!m.resultados?.length && (
                    <div className="mt-2 space-y-1">
                      {m.resultados.map((r, i) => (
                        <Link
                          key={`${r.type}-${r.id}-${i}`}
                          to={rutaDeResultado(r)}
                          target="_blank"
                          rel="noopener"
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-left"
                        >
                          <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate">{r.label}</span>
                          <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {NOMBRE_DE_TIPO[r.type] || r.type}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* SIN GASTAR IA, Y CON LA PUERTA ABIERTA. Se dice que esto
                      ha salido de la base de datos —para que no parezca que lo
                      ha redactado un modelo— y se deja preguntárselo a la IA
                      igualmente: buscar va primero, pero no puede ser la única
                      salida. */}
                  {m.reintentarIA && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-400">Buscado en la plataforma · sin gastar IA</span>
                      <button
                        onClick={() => send(`${m.reintentarIA} (respóndeme tú)`)}
                        className="text-[10px] font-black text-emerald-700 hover:underline"
                      >
                        Preguntárselo a la IA
                      </button>
                    </div>
                  )}

                  {!!m.creado?.length && (
                    <div className="mt-2 space-y-1">
                      {m.creado.map((c, i) => (
                        // UN ENLACE DE VERDAD, no un botón (2026-08-20). Era
                        // un <button> con navigate(), así que no se podía
                        // abrir en otra pestaña, no enseñaba a dónde va, y no
                        // aparecía al buscar enlaces en la página — que es
                        // justo como el Tester comprobó que «no había ficha».
                        <Link
                          key={i}
                          to={c.url}
                          // Se abre en otra pestaña: ir a mirar lo que acabas de
                          // crear no debería sacarte de la conversación.
                          target="_blank"
                          rel="noopener"
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors text-left"
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{c.titulo}</span>
                            {c.detalle && (
                              <span className="block text-[10px] font-normal text-emerald-700/70 truncate">{c.detalle}</span>
                            )}
                          </span>
                          <span className="text-emerald-600 shrink-0">abrir</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.aviso && (
                    <p className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                      {m.aviso}
                    </p>
                  )}

                  {/* QUÉ COSTÓ DE VERDAD (D91, 2026-08-21, Eugenio: «que en
                      el chat aparezca el coste de cada petición, aunque sea
                      gratis para el usuario, que diga cuál ha sido el coste»).

                      Antes esta línea ponía «gratis» y nada más. Gratis PARA
                      TI no es gratis PARA LA PLATAFORMA, y decir solo lo
                      segundo era decir media verdad. Ahora van las dos cosas:
                      lo que cuesta producir la respuesta y, al lado, si a ti
                      te la cobran o no.

                      Y si no hay dato de coste se DICE. Un cero inventado en
                      una cifra de dinero es peor que un hueco: el cero parece
                      una medida y el hueco se ve que falta. */}
                  {m.usage && (
                    <p className="mt-2 pt-1.5 border-t border-slate-200/70 text-[9px] text-slate-400 flex items-center gap-1 flex-wrap">
                      <Euro className="w-2.5 h-2.5 shrink-0" />
                      <span className="font-bold text-slate-500">
                        {typeof m.usage.costCents === 'number' ? euros(m.usage.costCents) : 'coste no registrado'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>
                        {(() => {
                          // El proveedor devuelve el ID con fecha (p. ej. claude-haiku-4-5-20251001);
                          // el catálogo usa el ID corto — se empareja por prefijo.
                          const entry = Object.entries(status?.models || {}).find(([id]) => m.usage!.model.startsWith(id));
                          return entry ? entry[1].label : m.usage!.model;
                        })()}
                      </span>
                      {typeof m.usage.durationMs === 'number' && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{segundos(m.usage.durationMs)}</span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      {m.usage.totalCents > 0
                        ? <span>te cuesta {(m.usage.totalCents / 100).toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} € (incl. comisión)</span>
                        : <span className="text-emerald-600 font-bold">gratis para ti</span>}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
                </span>
                <p className="text-xs text-slate-500 font-medium">
                  Trabajando en ello — investigando y creando lo que has pedido…
                </p>
              </div>
            )}
    </>
  );

  // Contenido del panel, compartido entre el acople de escritorio (columna
  // real junto al mapa) y el cajón a pantalla completa de móvil — solo se
  // monta uno de los dos a la vez, según `isDesktop`.
  /** EL MUELLE LE DEJA SITIO A LA PÁGINA (2026-08-21). Un elemento fijo abajo
   *  tapa lo que haya debajo, que es exactamente el fallo que se acaba de
   *  arreglar con el botón de la IA (B91). Se publica la altura en una
   *  variable de CSS y el armazón la usa como hueco al final del contenido, así
   *  que la última fila de una tabla siempre se puede leer.
   *
   *  Va por variable y no por un estado compartido porque el armazón y el
   *  asistente son hermanos, no padre e hijo: subir este número hasta el
   *  ancestro común obligaría a repintar toda la aplicación en cada píxel del
   *  arrastre. */
  useEffect(() => {
    const raiz = document.documentElement;
    // ABAJO SIEMPRE LA BARRA, que existe esté abierto o no: ponerlo a 0 al
    // cerrar taparía el final de cada página.
    // MÁS EL BORDE DEL TELÉFONO (2026-08-22, Eugenio, con la aplicación ya
    // instalada en su iPhone: «el menú inferior en PWA está demasiado pegado a
    // la parte inferior»). Instalada a pantalla completa no hay barra de Safari
    // debajo, así que la de la aplicación queda encima de la rayita del iPhone.
    // `env(safe-area-inset-bottom)` vale 0 en el navegador y ~34px instalada:
    // una sola regla para los dos casos.
    raiz.style.setProperty('--hueco-muelle', `calc(${ALTO_BARRA}px + env(safe-area-inset-bottom))`);
    // Y A LA DERECHA, el lateral cuando lo hay. En el teléfono no se reserva
    // nada: allí el panel ocupa la pantalla entera y no hay página detrás que
    // proteger.
    raiz.style.setProperty('--hueco-lateral', open && !esMovil ? `${anchoLateral}px` : '0px');
    return () => {
      raiz.style.setProperty('--hueco-muelle', '0px');
      raiz.style.setProperty('--hueco-lateral', '0px');
    };
  }, [open, esMovil, anchoLateral]);

  /** Arrastrar el borde de arriba para cambiar la altura. Se escucha en la
   *  ventana y no en el borde: si el ratón va más rápido que el repintado, el
   *  puntero se sale del borde y el arrastre se quedaría colgado. */
  useEffect(() => {
    if (!arrastrandoMuelle) return;
    const mover = (e: PointerEvent) => {
      const pct = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
      setAlturaMuelle(Math.min(75, Math.max(25, pct)));
    };
    const soltar = () => setArrastrandoMuelle(false);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    // `pointercancel` también: en un teléfono, una llamada entrante o un gesto
    // del sistema cancelan el puntero sin soltar, y sin esto el borde se
    // quedaría pegado al dedo.
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [arrastrandoMuelle]);

  /** La lista de conversaciones, para el lado del muelle. Es el MISMO dato que
   *  el desplegable de la cabecera; lo que cambia es dónde se enseña. */
  const listaHistorial = (
    <div className="h-full overflow-y-auto">
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Conversaciones</p>
        {/* Guardarlo otra vez. Solo sale cuando está fijo: en el asomado, el
            historial se cierra solo al apartar el ratón. */}
        {historialFijo && (
          <button onClick={() => { setHistorialFijo(false); setHistorialAsomado(false); }}
            title="Guardar el historial"
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors">
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => { newConversation(); }} title="Nueva conversación"
          className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {!user ? (
        <p className="px-3 py-3 text-[11px] text-slate-400">Inicia sesión para guardar tus conversaciones.</p>
      ) : historial.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-slate-400">Todavía no hay conversaciones.</p>
      ) : historial.map(c => (
        <div key={c.id}
          className={cn('group flex items-center gap-1 px-2 py-1.5 border-b border-slate-50 transition-colors',
            c.id === conversationId ? 'bg-emerald-50' : 'hover:bg-white')}>
          <button onClick={() => { cargarConversacion(c.id); setHistorialALaVista(false); }}
            className="min-w-0 flex-1 text-left">
            <span className="block text-[11px] font-bold text-slate-700 truncate">
              {c.title || 'Sin título'}
            </span>
            <span className="block text-[9px] text-slate-400">
              {c.message_count} {c.message_count === 1 ? 'mensaje' : 'mensajes'}
            </span>
          </button>
          <button onClick={() => olvidarConversacion(c.id)} title="Quitar del historial"
            className="p-1 rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );

  const panelBody = (
    <>
      {/* ══ LA FILA DE ARRIBA, SOLO BOTONES ══════════════════════════════
          FUERA «VIENDO: …» (2026-08-22, Eugenio: «quita lo de la vista de lo
          que está viendo la IA, no sirve»). Era una línea diciendo qué página
          tenías delante. Se puso para poder comprobar que la IA recibía el
          contexto —y valió para eso— pero comprobar algo una vez no es motivo
          para enseñarlo siempre: al que usa el chat le ocupa una línea en cada
          pantalla para contarle algo que ya sabe, porque la página la tiene
          delante. El contexto se le sigue mandando a la IA; lo que se quita es
          el cartel.

          Los botones se quedan: son la única salida del panel. */}
      <div className="shrink-0 px-3 py-1.5 flex items-center gap-2 border-b border-slate-100 bg-slate-50/60">
        <div className="ml-auto flex items-center gap-0.5 shrink-0">
          {/* ══ EL SELECTOR DE ANCHO ═══════════════════════════════════════
              (2026-08-22, Eugenio: «que la ventana de chatIA ocupe el 50% de
              la pantalla y se pueda con un selector ensanchar o reducir el
              ancho»).

              TRES ANCHOS Y NO UNA RUEDA: un tercio, la mitad y dos tercios. Es
              lo que de verdad se elige —«que quepa la página de detrás» o «que
              quepa la respuesta»—, y con tres botones se acierta a la primera.
              Quien quiera un valor exacto tiene el borde izquierdo, que se
              arrastra. Solo en el ordenador: en el teléfono ocupa todo. */}
          {!esMovil && (
            <span className="hidden md:inline-flex items-center rounded-lg bg-white border border-slate-200 p-0.5 mr-1">
              {[{ p: 33, t: 'Un tercio' }, { p: 50, t: 'La mitad' }, { p: 66, t: 'Dos tercios' }].map(o => (
                <button
                  key={o.p}
                  onClick={() => guardarAncho(o.p)}
                  title={`Ancho: ${o.t.toLowerCase()} de la pantalla`}
                  className={cn('px-1.5 py-0.5 rounded text-[10px] font-black transition-colors',
                    Math.abs(anchoPct - o.p) < 4 ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700')}
                >
                  {o.p}%
                </button>
              ))}
            </span>
          )}
          {/* En el teléfono el historial se abre encima; en pantalla ancha ya
              está a la izquierda y este botón no sale. */}
          <button onClick={() => setHistorialALaVista(v => !v)} title="Historial de conversaciones"
            className={cn('md:hidden w-7 h-7 grid place-items-center rounded-lg transition-colors',
              historialALaVista ? 'text-emerald-600 bg-white' : 'text-slate-400 hover:text-slate-700 hover:bg-white')}>
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { newConversation(); setHistorialALaVista(false); }} title="Nueva conversación"
            className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setOpen(false)} title="Cerrar el chat"
            className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

          {/* EL DESPLEGABLE DEL HISTORIAL SE RETIRÓ (2026-08-21): ahora la
              lista vive a un lado del muelle, fija en pantalla ancha y
              deslizante en el teléfono. Tener las dos era enseñar dos puertas
              a la misma habitación, y una de ellas empujaba la conversación
              hacia abajo cada vez que se abría. */}


          {/* Configuración: permisos de edición */}
          {/* LOS AJUSTES YA NO SON UN PANEL (2026-08-21). Lo único que había
              dentro eran los permisos de edición, y empujaban la conversación
              hacia abajo cada vez que se abrían. Ahora están en la fila de
              abajo, junto a lo demás que se decide justo antes de escribir. */}

          {/* Conversación */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {conversationInner}
          </div>

          {/* ══ LA FILA DE ABAJO, MÍNIMA (2026-08-21, Eugenio: «con el botón
              de "+" para los archivos, un icono minimalista para el micro, y
              el modelo, todo abajo del todo […] y que entonces se quede más
              espacio para ver las respuestas»). ═══════════════════════════

              LA CAJA VA PRIMERO Y LOS CONTROLES DEBAJO, no al revés. Lo que
              se hace aquí es escribir; adjuntar y elegir modelo son cosas de
              antes o de después. Al ponerlos encima, cada vez que mirabas
              dónde escribir tenías que saltarte tres botones.

              Y SOLO ICONOS. «Adjuntar», «Dictar» y el nombre del modelo con
              su etiqueta ocupaban dos líneas de un panel que mide un tercio
              de pantalla; eso son dos líneas menos de respuesta. El nombre
              del modelo se queda —es un dato, no una etiqueta— y las palabras
              se van al `title`, donde no roban sitio. */}
          <div className="border-t border-slate-100 px-3 pt-2.5 pb-2 space-y-2 bg-white">
            {attachment && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                {attachment.mediaType === 'application/pdf' ? <FileText className="w-3.5 h-3.5 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate flex-1">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="text-emerald-600 hover:text-emerald-900 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {attachError && (
              <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{attachError}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={barInputRef}
                value={input}
                onChange={e => { setInput(e.target.value); dictationBase.current = e.target.value; }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={2}
                placeholder={selectedModel === 'gemini-2.5-flash-image' ? 'Describe la imagen que quieres generar…' : 'Escribe tu pregunta…'}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* LOS PERMISOS, PRIMERO. Es lo que decide si la IA puede tocar
                  tus datos o solo sugerir, así que se ve sin abrir nada — pero
                  en texto pequeño, no en un panel de tres botones. */}
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowSettings(v => !v); }}
                  title={EDIT_MODE_LABELS[editMode].hint}
                  className={cn('px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                    showSettings ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')}
                >
                  {EDIT_MODE_LABELS[editMode].label}
                </button>
                {showSettings && (
                  <div className="absolute left-0 bottom-full mb-1 z-30 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-1"
                    onClick={e => e.stopPropagation()}>
                    {(Object.keys(EDIT_MODE_LABELS) as EditMode[]).map(m => (
                      <button key={m}
                        onClick={() => { setEditMode(m); setShowSettings(false); }}
                        className={cn('w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors',
                          editMode === m ? 'bg-emerald-50' : 'hover:bg-slate-50')}
                      >
                        <span className="block font-bold text-slate-700">{EDIT_MODE_LABELS[m].label}</span>
                        <span className="block text-[10px] text-slate-400 leading-snug">{EDIT_MODE_LABELS[m].hint}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={e => { handleFileSelect(e.target.files?.[0]); e.target.value = ''; }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar una imagen o un PDF"
                aria-label="Adjuntar una imagen o un PDF"
                className={cn('w-8 h-8 grid place-items-center rounded-lg transition-colors',
                  attachment ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}
              >
                <Plus className="w-4 h-4" />
              </button>
              {voiceSupported && (
                <button
                  onClick={handleMicClick}
                  title={listening ? 'Detener el dictado' : 'Dictar por voz'}
                  aria-label={listening ? 'Detener el dictado' : 'Dictar por voz'}
                  className={cn('w-8 h-8 grid place-items-center rounded-lg transition-colors',
                    listening ? 'bg-red-50 text-red-600 animate-pulse' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              {/* EL MODELO, ABAJO Y CON SU NOMBRE (2026-08-20, petición de
                  Eugenio). Antes el nombre estaba en letra pequeña arriba y
                  el selector escondido en Ajustes: dos sitios para una sola
                  cosa que se decide justo antes de escribir. */}
              {status?.models && (
                <div className="relative ml-auto">
                  <button
                    onClick={e => { e.stopPropagation(); setModelosAbierto(v => !v); }}
                    title="Elegir el modelo de IA"
                    className={cn('inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors max-w-[12rem]',
                      modelosAbierto ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')}
                  >
                    {/* CON LA PALABRA «MODELO» DELANTE (2026-08-22, Eugenio:
                        «pon el contexto con la palabra Modelo en el selector
                        de modelo de IA»). Suelto, «Equilibrado» al lado de un
                        micrófono y un clip no dice de qué es ajuste. */}
                    <span className="text-slate-400 font-black shrink-0">Modelo</span>
                    <span className="truncate">{modeloActual}</span>
                    <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
                  </button>

                  {modelosAbierto && (
                    <div
                      className="absolute right-0 bottom-full mb-1 z-30 w-80 max-h-[26rem] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1.5"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* ══ CINCO OPCIONES, NO NUEVE MODELOS ═══════════════════
                          (2026-08-22, Eugenio: «las opciones, deja escoger
                          entre 3: modelo sencillo, medio, alto. Y pon uno
                          especial de generación de imágenes, y otro de
                          generación de vídeos»).

                          Antes salía el catálogo entero con sus nombres de
                          fábrica —Haiku 4.5, Fable 5, gemini-pro-latest—, que
                          solo sirven para elegir si ya sabes quién los hace y
                          cuánto valen. Lo que se decide aquí es cuánto quieres
                          gastarte y en qué, y eso son estas cinco. */}
                      <button
                        onClick={() => { setSelectedModel(''); setModelosAbierto(false); }}
                        className={cn('w-full text-left px-2.5 py-2 rounded-lg border transition-colors mb-1',
                          !selectedModel ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-transparent hover:bg-slate-50')}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[12px] font-black text-slate-800">Cambio automático de modelo</span>
                          <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                            recomendado
                          </span>
                        </span>
                        <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">
                          Para cada mensaje se usa el más barato que sirva. Incluido, no te cuesta nada.
                        </span>
                      </button>

                      {(status.niveles || []).map(n => {
                        const info = n.modelo ? status.models?.[n.modelo] : undefined;
                        const bloqueado = !!info && (info.nivelMinimo ?? 0) > (user?.roleLevel ?? 0);
                        // NO SE PUEDE ELEGIR SI NO HAY NADA DETRÁS, y se dice
                        // por qué. Un botón apagado sin motivo se lee como un
                        // fallo de la aplicación.
                        const noHay = !n.modelo || !info;
                        const elegido = !!n.modelo && selectedModel === n.modelo;
                        return (
                          <button
                            key={n.clave}
                            disabled={noHay || bloqueado}
                            onClick={() => { if (n.modelo) { setSelectedModel(n.modelo); setModelosAbierto(false); } }}
                            className={cn('w-full text-left px-2.5 py-2 rounded-lg border transition-colors',
                              noHay || bloqueado ? 'border-transparent opacity-55 cursor-not-allowed'
                                : elegido ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-transparent hover:bg-slate-50')}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-[12px] font-black text-slate-800">{n.label}</span>
                              {/* QUIÉN LO PAGA, AL LADO DEL NOMBRE (Eugenio:
                                  «pon también los que están incluidos y que
                                  quede claro»). «Incluido» y el precio
                                  contestan dos preguntas distintas: cuánto
                                  vale y si te lo cobran. Hacen falta las dos. */}
                              <span className={cn('ml-auto shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                                noHay ? 'text-slate-400 bg-slate-100'
                                  : bloqueado ? 'text-amber-700 bg-amber-100'
                                    : 'text-emerald-700 bg-emerald-100')}>
                                {noHay ? 'todavía no' : bloqueado ? 'solo verificados' : 'incluido'}
                              </span>
                            </span>
                            <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">
                              {n.porQueNo || n.para}
                            </span>
                            {!noHay && (
                              <span className="block text-[10px] font-bold text-slate-600 tabular-nums mt-0.5">
                                {info!.image
                                  // Nano Banana se cobra por imagen y ese
                                  // precio no está medido todavía: se dice,
                                  // en vez de enseñar un 0 que parecería
                                  // gratis.
                                  ? 'Se cobra por imagen, no por mensaje'
                                  : `${costeEstimado(info!, status.tamanoTipico)} por mensaje`}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* EL QUE YA TENÍAS ELEGIDO, si no es ninguno de estos.
                          Se queda a la vista para poder quitarlo: esconderlo
                          dejaría el chat usando un modelo que el selector no
                          nombra por ningún lado. */}
                      {selectedModel && !(status.niveles || []).some(n => n.modelo === selectedModel) && (
                        <div className="mt-1 pt-1 border-t border-slate-100 px-2.5 py-1.5 text-[10px] text-slate-500 leading-snug">
                          Ahora mismo tienes elegido <b className="text-slate-700">{status.models?.[selectedModel]?.label || selectedModel}</b>,
                          que ya no está en la lista.{' '}
                          <button onClick={() => { setSelectedModel(''); setModelosAbierto(false); }}
                            className="font-black text-emerald-700 hover:underline">Volver al automático</button>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-500 px-2.5 py-1.5 leading-relaxed border-t border-slate-100 mt-1">
                        {/* DE DÓNDE SALE LA ESTIMACIÓN. Una cifra sin decir
                            sobre qué está calculada no se distingue de una
                            inventada, y por eso se dice siempre. */}
                        {(() => {
                          const t = status.tamanoTipico;
                          if (!t) return null;
                          const base = t.origen === 'tuyo'
                            ? `Calculado sobre tus ${t.n} últimas preguntas`
                            : t.origen === 'plataforma'
                              ? 'Calculado sobre las preguntas de la plataforma (aún no tienes suficientes)'
                              : 'Todavía no hay preguntas que medir: se supone un mensaje corriente';
                          return <>{base}. </>;
                        })()}
                        Todo esto lo paga la plataforma: «incluido» quiere decir que a ti no se te cobra. El modelo alto tiene un tope al mes.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {status && !status.ready && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                {status.message}
              </p>
            )}
          </div>
    </>
  );

  // La barra de abajo (modos `bar` e `inline`) se ha retirado el 2026-08-20:
  // eran otras dos caras del mismo chat, cada una con su comportamiento, y
  // Eugenio pidió que el asistente fuese el mismo en todas las herramientas.
  // Su micro y su «+» viven ahora dentro del panel.


  // A PANTALLA COMPLETA: el mismo chat, todo el ancho, sin botón flotante ni
  // columna redimensionable — el marco lo pone la página.
  if (modo === 'pagina') {
    return <div className="h-full flex flex-col bg-white">{panelBody}</div>;
  }

  return (
    <>
      {/* EL BOTÓN FLOTANTE SE RETIRÓ (2026-08-21). Existía para abrir un
          panel que no se veía; ahora el muelle está SIEMPRE abajo, así que un
          botón flotante encima sería una segunda puerta a una habitación que
          ya tiene la puerta abierta — y volvería a tapar contenido, que es lo
          que costó B91. */}

      {/* ══ EL MUELLE ═══════════════════════════════════════════════════════
          De lado a lado, pegado abajo, y SIEMPRE presente cuando el chat está
          abierto: la misma maqueta en el teléfono y en el ordenador. Antes
          eran dos —columna a la derecha en escritorio, cajón a pantalla
          completa en móvil— y eran dos sitios donde arreglar lo mismo.

          RESERVA SU SITIO EN LA PÁGINA. Un elemento fijo abajo tapa contenido,
          que es el fallo que acabamos de arreglar con el botón de la IA (B91).
          `Layout.tsx` lee esta misma altura y le deja hueco al final de la
          página, así que nada queda debajo. */}
      {/* ══ LA BARRA DE ABAJO, SIEMPRE ══════════════════════════════════════
          (2026-08-22, Eugenio: «está desapareciendo el menú de abajo cuando
          abro el chat, también cuando abro crear»).

          Antes la barra y el panel eran EL MISMO elemento cambiando de altura,
          así que abrir uno hacía desaparecer la otra. Ahora son dos hermanos:
          el panel se abre encima y la barra sigue debajo. Eso es lo que
          permite cambiar de sección sin tener que cerrar el chat primero —y
          sin ella, con el chat abierto la aplicación se quedaba sin
          navegación. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[9999] bg-white border-t border-slate-200 shadow-lg grid grid-cols-5 items-center"
        // El alto es el de los botones; el hueco del iPhone se añade DEBAJO con
        // padding, para que los iconos no se encojan al instalarla.
        style={{ height: ALTO_BARRA, boxSizing: 'content-box', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* EL ORDEN LO PIDIÓ EUGENIO Y TIENE SENTIDO DE LECTURA
            (2026-08-21): casa · proyectos · BUSCAR · mensajes · crear.
            Buscar va en el centro, que es el sitio del gesto más
            repetido, y ocupa el hueco grande porque preguntarle a la IA
            es la puerta principal de esta plataforma. Crear se va al
            extremo: se usa menos veces al día que buscar. */}
        <BotonMuelle icono={Home} label="Inicio" titulo="Publicaciones"
          activo={ruta === '/' || ruta.startsWith('/explorar')}
          onClick={() => navigate('/')} />
        <BotonMuelle icono={FolderKanban} label="Proyectos" titulo="Ir a tus proyectos"
          activo={ruta.startsWith('/proyectos')}
          onClick={() => navigate('/proyectos')} />

        <button
          onClick={() => { setOpen(true); setPanelMuelle('chat'); }}
          title="Preguntar a la IA"
          aria-label="Preguntar a la IA"
          // SIN FONDO NEGRO (2026-08-22, Eugenio: «no pongas un fondo
          // negro en el botón de buscar»). El negro se reserva para
          // decir DÓNDE ESTÁS; si el de buscar lo lleva siempre, hay dos
          // cosas negras a la vez y ninguna de las dos significa nada.
          className={cn('justify-self-center rounded-full grid place-items-center transition-colors w-12 h-9 sm:w-11 sm:h-8',
            open && panelMuelle !== 'crear'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-700')}
        >
          <Search className="w-[22px] h-[22px] sm:w-5 sm:h-5" />
        </button>

        <BotonMuelle icono={UsersRound} label="Red" titulo="Tus mensajes con personas"
          activo={ruta.startsWith('/mensajes') || ruta.startsWith('/personas')}
          onClick={() => navigate('/mensajes')} />
        <BotonMuelle icono={Plus} label="Crear" titulo="Crear algo nuevo"
          activo={open && panelMuelle === 'crear'}
          onClick={() => { setOpen(true); setPanelMuelle('crear'); }} />
      
      </nav>

      {open && (
        <div
          {...zonaSoltar}
          // ══ DÓNDE SE ABRE, SEGÚN LA PANTALLA (2026-08-22, Eugenio: «la
          //    parte de buscar con IA tiene que abrirte la pantalla completa
          //    en el móvil y en el ordenador una pantalla lateral derecha; la
          //    parte de crear también»). ═══════════════════════════════════
          //
          // CERRADO ES SIEMPRE LA BARRA DE ABAJO, en los dos. Lo que cambia es
          // lo que pasa al abrir: en un teléfono ocupa la pantalla entera,
          // porque un tercio de 812 px no da para leer una respuesta con una
          // tabla dentro; en un ordenador se va al lateral derecho, porque ahí
          // sobra ancho y lo que NO sobra es alto — y así la página que estás
          // mirando sigue delante mientras preguntas por ella.
          //
          // Se hace con clases y no con dos ramas de JSX a propósito: son la
          // misma caja con la misma conversación dentro. Dos ramas serían dos
          // sitios donde arreglar el mismo fallo, que es de lo que veníamos.
          className={cn('fixed z-[9998] flex flex-col bg-white transition-all duration-200',
            esMovil
                // Teléfono: todo, menos la barra de abajo — que se deja a la
                // vista para poder cerrar sin buscar una cruz. El hueco va por
                // CLASE y no por estilo en línea: mezclar los dos aquí hizo
                // que el `bottom` de la línea no llegara a aplicarse y el
                // panel se comiera la barra. Un solo mecanismo por propiedad.
                ? 'inset-x-0 top-0 bottom-11 shadow-2xl'
                // Ordenador: columna a la derecha, del alto entero.
                // Ordenador: columna a la derecha. También se para en la
                // barra: es la misma de siempre, va por encima (z mayor), y un
                // panel que le pasara por debajo escondería sus botones justo
                // en la esquina donde caen.
                : 'top-0 right-0 bottom-11 border-l border-slate-200 shadow-2xl')}
          style={esMovil ? undefined : { width: `${anchoLateral}px` }}
        >
          {/* EL BORDE IZQUIERDO SE ARRASTRA. Los tres botones de arriba son
              para elegir rápido; esto es para afinar. 6 px de ancho, que es lo
              mínimo que el ratón coge sin pelearse, y se guarda al soltar. */}
          {!esMovil && (
            <div
              onPointerDown={e => {
                e.preventDefault();
                const mover = (ev: PointerEvent) =>
                  setAnchoPct(Math.min(80, Math.max(25, ((window.innerWidth - ev.clientX) / window.innerWidth) * 100)));
                const soltar = (ev: PointerEvent) => {
                  window.removeEventListener('pointermove', mover);
                  window.removeEventListener('pointerup', soltar);
                  guardarAncho(((window.innerWidth - ev.clientX) / window.innerWidth) * 100);
                };
                window.addEventListener('pointermove', mover);
                window.addEventListener('pointerup', soltar);
              }}
              title="Arrastra para cambiar el ancho"
              className="absolute inset-y-0 -left-1 w-2 cursor-ew-resize z-30 hover:bg-emerald-200/60 transition-colors"
            />
          )}
          {/* ── EL VISOR DE «CREAR» ──────────────────────────────────────────
              CADA BOTÓN LLEVA DONDE ESO SE CREA DE VERDAD. Hoy cada cosa se
              crea dentro de la página de su tipo, así que esto no inventa
              formularios nuevos: es el atajo que faltaba para no tener que
              saberse de memoria en qué página vive cada creación.

              LO QUE NO ESTÁ, NO ESTÁ. No hay «subir un archivo» suelto, porque
              un fichero necesita colgar de algo —proyecto, tarea o página— y
              uno sin dueño es exactamente el problema que arreglamos hoy. Se
              sube desde la cosa a la que pertenece, y por eso aquí se lleva al
              proyecto. */}
          {open && panelMuelle === 'crear' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Crear</p>
                <button onClick={() => { setOpen(false); setPanelMuelle(null); }} title="Cerrar"
                  className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {HERRAMIENTAS_CREAR.map(h => (
                  <button
                    key={h.destino}
                    onClick={() => { navigate(h.destino); setOpen(false); setPanelMuelle(null); }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                  >
                    <h.icono className="w-5 h-5 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{h.label}</span>
                  </button>
                ))}
                {/* Pedírselo a la IA es otra forma de crear, y muchas veces la
                    más rápida: «créame una tarea para el viernes». */}
                <button
                  onClick={() => setPanelMuelle('chat')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-700 text-center leading-tight">Pedírselo a la IA</span>
                </button>
              </div>
            </div>
          )}

          {/* SI NO HAY PANEL ELEGIDO, EL CHAT. Tres sitios abren el muelle
              sin decir cuál —enfocar la caja, rellenarla desde otra página, el
              evento `ai:abrir`— y con una comprobación estricta se abriría un
              muelle vacío. Se arregla en los tres sitios Y aquí: el que falle
              primero no deja al usuario mirando un hueco blanco. */}
          {open && panelMuelle !== 'crear' && <>
          {/* El borde de arriba se arrastra para cambiar la altura. Es una
              barra de 10 px y no una línea de 1: en un dedo, una línea de un
              píxel no se puede coger. */}
          <div
            onPointerDown={e => { e.preventDefault(); setArrastrandoMuelle(true); }}
            title="Arrastra para cambiar la altura"
            className={cn('h-2.5 shrink-0 cursor-ns-resize grid place-items-center touch-none',
              arrastrandoMuelle ? 'bg-emerald-100' : 'hover:bg-slate-100')}
          >
            <span className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          <div className="flex-1 min-h-0 flex">
            {/* EL HISTORIAL, A UN LADO. En pantalla ancha es una columna fija;
                en un teléfono se abre encima, porque quitarle 200 px de ancho
                a una pantalla de 375 dejaría la conversación en un canal. */}
            <aside
              onMouseEnter={() => setHistorialAsomado(true)}
              onMouseLeave={() => setHistorialAsomado(false)}
              className={cn('hidden md:flex relative shrink-0 flex-col border-r border-slate-100 bg-slate-50/60 transition-[width] duration-200',
                historialFijo ? 'w-52' : 'w-10')}
            >
              {historialFijo ? (
                listaHistorial
              ) : (
                <>
                  {/* LA TIRA. Un botón para fijarlo y el número de
                      conversaciones que hay: sin el número, una tira vacía y
                      una tira con veinte charlas dentro se ven igual. */}
                  <button
                    onClick={() => setHistorialFijo(true)}
                    title="Historial de conversaciones"
                    className="w-full py-2 grid place-items-center text-slate-400 hover:text-emerald-700 hover:bg-white transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  {historial.length > 0 && (
                    <span className="text-[9px] font-black text-slate-300 text-center">{historial.length}</span>
                  )}
                  <button
                    onClick={() => newConversation()}
                    title="Nueva conversación"
                    className="mt-1 w-full py-2 grid place-items-center text-slate-400 hover:text-emerald-700 hover:bg-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* SEMIDESPLEGADO: se asoma ENCIMA de la conversación, no
                      empujándola. Si empujara, el texto que estás leyendo se
                      movería solo por pasar el ratón cerca del borde. */}
                  {historialAsomado && (
                    <div className="absolute inset-y-0 left-0 w-48 z-20 bg-white border-r border-slate-200 shadow-2xl flex flex-col">
                      <div className="flex-1 min-h-0">{listaHistorial}</div>
                      <button
                        onClick={() => setHistorialFijo(true)}
                        className="shrink-0 px-3 py-2 border-t border-slate-100 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                      >
                        <ChevronRight className="w-3.5 h-3.5" /> Dejarlo abierto
                      </button>
                    </div>
                  )}
                </>
              )}
            </aside>
            {historialALaVista && (
              <>
                {/* TOCAR FUERA LO CIERRA. Sin esto, la única salida era volver
                    al mismo botón que lo abrió, que está DEBAJO del panel: se
                    abría algo que tapaba su propio interruptor. */}
                <button
                  aria-label="Cerrar el historial"
                  onClick={() => setHistorialALaVista(false)}
                  className="md:hidden absolute inset-0 top-2.5 z-10 bg-slate-900/20"
                />
                <div className="md:hidden absolute inset-y-0 left-0 top-2.5 w-64 z-20 bg-white border-r border-slate-200 shadow-xl flex flex-col">
                  <div className="flex-1 min-h-0">{listaHistorial}</div>
                  <button
                    onClick={() => setHistorialALaVista(false)}
                    className="shrink-0 px-3 py-2 border-t border-slate-100 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Cerrar el historial
                  </button>
                </div>
              </>
            )}

            <div className="flex-1 min-w-0 flex flex-col">{panelBody}</div>
          </div>
          {avisoSoltar}
          </>}
        </div>
      )}
    </>
  );
}
