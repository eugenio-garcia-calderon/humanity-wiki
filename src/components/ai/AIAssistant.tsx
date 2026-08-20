import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, X, Send, Globe, Database, Plus, MessageSquare, Settings2, Check, Ban, Paperclip, FileText, Image as ImageIcon, Network, Mic, MicOff, Cpu, Euro, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePanelWidth } from '../../hooks/usePanelWidth';
import { pedirVentanas } from '../ventanas/bus';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import ResizeHandle from '../ui/ResizeHandle';
import PublicationPopup from '../knowledge/PublicationPopup';
import { cn } from '../../utils/cn';

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
  autonomo: { label: 'Autónomo', hint: 'La IA aplica directamente lo que tu rol permita.' },
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
  usage?: { model: string; totalCents: number };
  /** Pregunta con opciones (estilo Claude Code): botones 1/2/… + «Otro». */
  question?: { text: string; options: string[]; answered?: boolean };
  /** Imagen generada por Nano Banana, cuando el modelo elegido es de imagen. */
  imageUrl?: string;
}

/** Modelo de Anthropic o Google disponible para elegir (Fase 12), con precio por 1M tokens en céntimos de €. */
interface AIModelInfo { label: string; hint: string; input: number; output: number; image?: boolean; }

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

export default function AIAssistant() {
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
  const [status, setStatus] = useState<{ ready: boolean; message: string; models?: Record<string, AIModelInfo>; platformFee?: number } | null>(null);
  // Modelo elegido por el usuario para sus creaciones (Fase 12) — vacío = el de la plataforma.
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
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
    const enfocar = () => { setOpen(true); setTimeout(() => barInputRef.current?.focus(), 60); };
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
      }
    };
    window.addEventListener('humanity:juego-contexto', alContexto);
    return () => window.removeEventListener('humanity:juego-contexto', alContexto);
  }, []);
  const interlocutor = useRef<string | null>(null);
  const { user } = useAuth();

  // HISTORIAL (Eugenio, 2026-08-20: «con historial de conversaciones»). La
  // ruta ya existía y no la usaba nadie: lo que faltaba era el sitio donde
  // enseñarlo. Se pide al abrir el cajón y después de cada respuesta, para
  // que la conversación de ahora aparezca en la lista con su título.
  const [listaAbierta, setListaAbierta] = useState(false);
  const [historial, setHistorial] = useState<Array<{ id: string; title: string | null; message_count: number; updated_at: string }>>([]);
  const cargarHistorial = useCallback(() => {
    if (!user) { setHistorial([]); return; }
    fetch('/api/ai/conversations', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setHistorial(Array.isArray(j) ? j : []))
      .catch(() => setHistorial([]));
  }, [user]);
  useEffect(() => { if (listaAbierta) cargarHistorial(); }, [listaAbierta, cargarHistorial]);

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
      if (typeof text === 'string') { setInput(text); setOpen(true); }
    };
    window.addEventListener('ai:prefill', onPrefill);
    return () => window.removeEventListener('ai:prefill', onPrefill);
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
  const modeloActual = selectedModel && status?.models?.[selectedModel]
    ? status.models[selectedModel].label
    : 'Modelo de la plataforma';

  const currentContext = () => ({
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

  /** Aplica los eventos de interfaz que devuelve el modelo. */
  const applyUiEvents = (events: any[]) => {
    for (const e of events || []) {
      const p = e.params || {};
      switch (e.type) {
        case 'OPEN_TERRITORY':
        case 'ZOOM_TO_TERRITORY':
          navigate(`/mapa?territorio=${encodeURIComponent(p.territorySlug || p.territoryId || '')}`);
          break;
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
        case 'OPEN_CHALLENGE': navigate(`/retos/${p.slug || p.challengeId}`); break;
        case 'OPEN_SOLUTION':  navigate(`/soluciones/${p.slug || p.solutionId}`); break;
        case 'SHOW_MARKET':    navigate('/mercado'); break;
        case 'SHOW_INITIATIVES': navigate('/iniciativas'); break;
        case 'OPEN_KNOWLEDGE_GRAPH': navigate(`/esquemas/${p.slug || p.graphId || ''}`); break;
        case 'OPEN_USER_MAP': navigate(`/mapas/${p.slug || p.mapId || ''}`); break;
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
      const pideDocumento =
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
      const json = await res.json();
      if (!res.ok) {
        setMessages(m => [...m, { role: 'assistant', content: json.error || 'No se pudo responder.', error: true }]);
        return;
      }
      setConversationId(json.conversation_id);
      if (listaAbierta) cargarHistorial();
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
        usage: json.usage ? { model: json.usage.model, totalCents: json.usage.totalCents } : undefined,
        imageUrl: json.imageUrl || undefined,
      }]);
      applyUiEvents(json.ui_events);

      // Modo AUTÓNOMO: las acciones permitidas se ejecutan solas (sin botones
      // de confirmación) y, si crean un grafo o un mapa, se abre directamente.
      for (const a of json.proposed_actions || []) {
        if (!a.autoApply || a.status !== 'propuesta') continue;
        const rj = await decideAction(a.id, 'aceptar', -1);
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
                <div className={cn('max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user' ? 'bg-emerald-600 text-white'
                    : m.error ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-800')}>
                  {m.attachmentName && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white/20 px-1.5 py-0.5 rounded mb-1">
                      <Paperclip className="w-2.5 h-2.5" /> {m.attachmentName}
                    </span>
                  )}
                  {m.attachmentName && <br />}
                  {m.content}

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
                          <p className="text-[11px] font-bold text-slate-800">{a.description || a.action_type}</p>
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

                  {/* Coste real de esta respuesta: créditos de Anthropic + comisión (Fase 12) */}
                  {m.usage && (
                    <p className="mt-2 pt-1.5 border-t border-slate-200/70 text-[9px] text-slate-400 flex items-center gap-1">
                      <Euro className="w-2.5 h-2.5" />
                      {(m.usage.totalCents / 100).toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €
                      · {(() => {
                        // El proveedor devuelve el ID con fecha (p. ej. claude-haiku-4-5-20251001);
                        // el catálogo usa el ID corto — se empareja por prefijo.
                        const entry = Object.entries(status?.models || {}).find(([id]) => m.usage!.model.startsWith(id));
                        return entry ? entry[1].label : m.usage!.model;
                      })()} · incl. comisión de la plataforma
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
  const panelBody = (
    <>
      {/* Cabecera: quién te habla, con qué modelo y DÓNDE ESTÁS. Ese último
          dato es el que hace ver de un vistazo que la IA sabe qué tienes
          delante (Eugenio, 2026-08-20: «que la IA vea en la página que
          estás»), sin tener que preguntárselo para comprobarlo. */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 leading-none truncate">{tituloInterlocutor}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {status?.ready ? modeloActual : 'Inactivo — falta clave de API'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setListaAbierta(v => !v)} title="Historial de conversaciones"
                  className={cn('p-1.5 rounded-lg transition-colors', listaAbierta ? 'text-emerald-600 bg-white' : 'text-slate-400 hover:text-slate-700 hover:bg-white')}>
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={() => { newConversation(); setListaAbierta(false); }} title="Nueva conversación" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setShowSettings(v => !v)} title="Configuración" className={cn('p-1.5 rounded-lg transition-colors', showSettings ? 'text-emerald-600 bg-white' : 'text-slate-400 hover:text-slate-700 hover:bg-white')}>
                  <Settings2 className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} title="Cerrar" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500">
              <Eye className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">Viendo: {dondeEstoy}</span>
            </p>
          </div>

          {/* HISTORIAL */}
          {listaAbierta && (
            <div className="border-b border-slate-100 bg-white max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {!user ? (
                <p className="px-4 py-3 text-[11px] text-slate-400">Inicia sesión para guardar tus conversaciones.</p>
              ) : historial.length === 0 ? (
                <p className="px-4 py-3 text-[11px] text-slate-400">Todavía no hay conversaciones guardadas.</p>
              ) : historial.map(c => (
                <div key={c.id}
                  className={cn('group flex items-center gap-2 px-4 py-2 border-b border-slate-50 last:border-0 transition-colors',
                    c.id === conversationId ? 'bg-emerald-50' : 'hover:bg-slate-50')}>
                  <button onClick={() => { cargarConversacion(c.id); setListaAbierta(false); }}
                    className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-bold text-slate-700 truncate">{c.title || 'Sin título'}</p>
                    <p className="text-[10px] text-slate-400">
                      {c.message_count} mensajes · {new Date(c.updated_at).toLocaleDateString('es-ES')}
                    </p>
                  </button>
                  <button onClick={() => olvidarConversacion(c.id)} title="Quitar del historial"
                    className="shrink-0 p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Configuración: permisos de edición */}
          {showSettings && (
            <div className="px-4 py-3 border-b border-slate-100 bg-white space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Permisos de edición</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(EDIT_MODE_LABELS) as EditMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setEditMode(m)}
                    className={cn(
                      'px-2 py-2 rounded-lg text-[11px] font-bold border transition-colors',
                      editMode === m
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                    )}
                  >
                    {EDIT_MODE_LABELS[m].label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{EDIT_MODE_LABELS[editMode].hint}</p>

              {/* Modelo de IA para tus creaciones (grafos, mapas, chat) — Fase 12 */}
              {status?.models && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Modelo de IA
                  </p>
                  <div className="space-y-1">
                    {Object.entries(status.models).map(([id, info]) => (
                      <button
                        key={id}
                        onClick={() => setSelectedModel(id)}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors flex items-center justify-between gap-2',
                          selectedModel === id ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-emerald-200'
                        )}
                      >
                        <span>
                          <span className="font-bold text-slate-700">{info.label}</span>
                          <span className="text-slate-400"> · {info.hint}</span>
                        </span>
                        <span className="text-slate-400 shrink-0">
                          {info.image ? 'por imagen' : `$${(info.input / 100).toFixed(2)}/$${(info.output / 100).toFixed(2)} p. 1M`}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    Se te factura el coste real de créditos de Anthropic más un {Math.round((status.platformFee ?? 0.5) * 100)}% de comisión de la plataforma. Precio orientativo por millón de tokens (entrada/salida).
                  </p>
                </div>
              )}

              {!user && (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Sin sesión iniciada, el asistente solo puede consultar información. No podrá modificar nada.
                </p>
              )}
            </div>
          )}

          {/* Conversación */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {conversationInner}
          </div>

          {/* Entrada */}
          <div className="border-t border-slate-100 p-3 space-y-2 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={e => { handleFileSelect(e.target.files?.[0]); e.target.value = ''; }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar imagen o PDF"
                className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors',
                  attachment ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}
              >
                <Paperclip className="w-3 h-3" /> Adjuntar
              </button>
              {voiceSupported && (
                <button
                  onClick={handleMicClick}
                  title={listening ? 'Detener dictado' : 'Dictar por voz'}
                  className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors',
                    listening ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}
                >
                  {listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />} {listening ? 'Escuchando…' : 'Dictar'}
                </button>
              )}
            </div>
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


  return (
    <>
      {/* Botón flotante permanente: se mantiene fijo aunque el panel esté
          acoplado, ya que no forma parte de la columna con ancho real. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Asistente de Humanity.wiki"
          // Abajo del todo a la derecha (Eugenio, 2026-08-20). Antes iba a
          // `bottom-20` para dejar hueco a la barra de chat, que ya no existe.
          className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Escritorio: columna real acoplada junto al mapa, redimensionable y
          con el ancho grabado en la cuenta del usuario. No se superpone: al
          abrirse, empuja el contenido de <main> porque es un hermano flex
          normal (ver Layout.tsx), no un elemento `fixed`. */}
      {open && isDesktop && (
        <div
          className="relative h-full shrink-0 bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in fade-in duration-150"
          style={{ width: `${width}%` }}
        >
          <ResizeHandle onMouseDown={startResize('left')} edge="left" active={dragging} />
          {panelBody}
        </div>
      )}

      {/* Móvil: un 20% de una pantalla estrecha es inutilizable, así que ahí
          se mantiene como cajón a pantalla completa. */}
      {open && !isDesktop && (
        <div className="fixed inset-0 z-[9998] bg-white flex flex-col animate-in slide-in-from-right duration-200">
          {panelBody}
        </div>
      )}
    </>
  );
}
