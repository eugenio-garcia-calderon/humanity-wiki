import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, X, Send, Globe, Database, Plus, MessageSquare, Settings2, Check, Ban, Paperclip, FileText, Image as ImageIcon, Network } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePanelWidth } from '../../hooks/usePanelWidth';
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

export default function AIAssistant({ mode = 'dock' }: { mode?: 'dock' | 'bar' }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('manual');
  const [searchWeb, setSearchWeb] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<{ ready: boolean; message: string } | null>(null);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  // Modo barra (páginas de Grafos): grafos que coinciden con lo que se escribe.
  const [graphMatches, setGraphMatches] = useState<Array<{ slug: string; title: string; score: number }>>([]);
  // Pop-up central: la publicación real que responde a la pregunta.
  const [popupPub, setPopupPub] = useState<{ publication: any; graphs: any[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
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

  useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // Fast-path del buscador de grafos: al escribir en la barra, se consultan
  // los grafos publicados que coinciden (sin gastar una llamada a la IA).
  useEffect(() => {
    if (mode !== 'bar') return;
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
  const currentContext = () => ({
    route: location.pathname,
    territorio: searchParams.get('territorio'),
    nivel: searchParams.get('nivel'),
    entidadSeleccionada: searchParams.get('id'),
    usuario: user ? { id: user.id, nivel: user.roleLevel, rol: user.roleLabel } : null,
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
        case 'SHOW_INITIATIVES': navigate('/proyectos'); break;
        case 'OPEN_KNOWLEDGE_GRAPH': navigate(`/grafos/${p.slug || p.graphId || ''}`); break;
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

  const send = async () => {
    const text = input.trim();
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
      if (mode === 'bar' && !pendingAttachment) {
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
            navigate(`/grafos/${g.slug}`);
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
      setMessages(m => [...m, {
        role: 'assistant',
        content: json.reply,
        sources: json.sources,
        actions: json.proposed_actions,
      }]);
      applyUiEvents(json.ui_events);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: e.message || 'Error de red.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const decideAction = async (actionId: number, decision: 'aceptar' | 'rechazar', msgIndex: number) => {
    try {
      const res = await fetch(`/api/ai/actions/${actionId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      setMessages(m => m.map((msg, i) => i !== msgIndex ? msg : {
        ...msg,
        actions: (msg.actions || []).map((a: any) =>
          a.id === actionId ? { ...a, status: json.status || (decision === 'aceptar' ? 'ejecutada' : 'rechazada'), error: json.error } : a),
      }));
    } catch { /* el estado se queda como estaba */ }
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
                </div>
              </div>
            ))}

            {busy && <p className="text-xs text-slate-400 italic">Pensando…</p>}
    </>
  );

  // Contenido del panel, compartido entre el acople de escritorio (columna
  // real junto al mapa) y el cajón a pantalla completa de móvil — solo se
  // monta uno de los dos a la vez, según `isDesktop`.
  const panelBody = (
    <>
      {/* Cabecera */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 leading-none">Asistente</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {status?.ready ? 'Conectado' : 'Inactivo — falta clave de API'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={newConversation} title="Nueva conversación" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white transition-colors">
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
              <button
                onClick={() => setSearchWeb(v => !v)}
                title="Buscar también en internet"
                className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors',
                  searchWeb ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}
              >
                <Globe className="w-3 h-3" /> Internet {searchWeb ? 'activado' : 'desactivado'}
              </button>
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
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={2}
                placeholder="Escribe tu pregunta…"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
              />
              <button
                onClick={send}
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

  // ==========================================================================
  // MODO BARRA (páginas de Grafos): el chat/buscador vive centrado abajo,
  // siempre desplegado — es la puerta de entrada al conocimiento.
  // ==========================================================================
  if (mode === 'bar') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="mx-auto w-full max-w-2xl px-4 pb-4 pointer-events-auto">
          {(messages.length > 0 || busy) && (
            <div className="mb-2 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> Asistente de Conocimiento
                </span>
                <button onClick={newConversation} title="Nueva conversación" className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div ref={scrollRef} className="max-h-[42vh] overflow-y-auto px-4 py-4 space-y-4">
                {conversationInner}
              </div>
            </div>
          )}

          {/* Grafos que coinciden con lo escrito: fast-path sin gastar IA */}
          {graphMatches.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-center gap-1.5 animate-in fade-in duration-150">
              {graphMatches.map(g => (
                <button
                  key={g.slug}
                  onClick={() => { setInput(''); setGraphMatches([]); navigate(`/grafos/${g.slug}`); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg hover:bg-emerald-700 transition-colors"
                >
                  <Network className="w-3 h-3" /> {g.title}
                </button>
              ))}
            </div>
          )}

          {attachment && (
            <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 shadow">
              {attachment.mediaType === 'application/pdf' ? <FileText className="w-3.5 h-3.5 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate flex-1">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-emerald-600 hover:text-emerald-900 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {attachError && (
            <p className="mb-2 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5 shadow">{attachError}</p>
          )}

          {/* Barra de entrada */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 flex items-end gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              onChange={e => { handleFileSelect(e.target.files?.[0]); e.target.value = ''; }}
              className="hidden"
            />
            <button
              onClick={() => setSearchWeb(v => !v)}
              title={searchWeb ? 'Internet activado' : 'Internet desactivado'}
              className={cn('shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-colors',
                searchWeb ? 'bg-sky-50 border-sky-300 text-sky-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300')}
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen o PDF"
              className={cn('shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-colors',
                attachment ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300')}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Busca un tema o pregunta a la IA — p. ej. «Ceuta frontera amenaza»"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {status && !status.ready && (
            <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed shadow">
              {status.message}
            </p>
          )}
        </div>

        {popupPub && (
          <div className="pointer-events-auto">
            <PublicationPopup
              publication={popupPub.publication}
              graphs={popupPub.graphs || []}
              onClose={() => setPopupPub(null)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Botón flotante permanente: se mantiene fijo aunque el panel esté
          acoplado, ya que no forma parte de la columna con ancho real. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Asistente de Conocimiento de la Humanidad"
          className="fixed bottom-20 right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:scale-105 transition-transform"
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
