// ============================================================================
// MENSAJES (2026-08-20, «haz mensajería entre personas» · 2026-08-22, «que
// esta plataforma sustituya a WhatsApp»)
// ============================================================================
// Dos columnas, como cualquier bandeja: con quién hablas a la izquierda y la
// conversación a la derecha. `?con=<id>` abre una directamente, que es lo que
// usa el botón «Escribir» de un perfil y el del Teléfono.
//
// ── QUÉ CAMBIÓ EL 22 DE AGOSTO ─────────────────────────────────────────────
// Esto pedía la conversación al abrirla y ya está. Para sustituir a WhatsApp
// faltaba todo lo que hace que una mensajería se sienta viva:
//
//   · EL MENSAJE APARECE SOLO. Llega por la conexión abierta del teléfono
//     (`telecom/motor`), la misma por la que suena una llamada. Sin recargar y
//     sin preguntar cada dos segundos, que es lo que habría costado batería.
//   · LAS DOS MARCAS. ✓ guardado · ✓✓ entregado · ✓✓ azul, leído.
//   · «ESTÁ ESCRIBIENDO…» y el punto verde de quien está conectado.
//   · FOTOS, ARCHIVOS Y NOTAS DE VOZ.
//   · LLAMAR Y VIDEOLLAMAR desde la propia conversación.
//
// Lo que NO se ve y sigue ahí: cada mensaje deja un resumen en la memoria de
// las representaciones que cada cual tiene de la otra persona en su Mundo 3D.
// Se dice en la propia pantalla, porque una cosa así no debe pasar a escondidas.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Loader2, User as UserIcon, Brain, Phone, Video,
  Paperclip, Mic, Square, Check, CheckCheck, FileDown, X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { useTelecom } from '../telecom/useTelecom';
import { llamar, estoyEscribiendo } from '../telecom/motor';
import { reloj } from '../components/telecom/piezas';

interface Adjunto { url: string; tipo: string | null; nombre: string | null; segundos: number | null }
interface Conversacion {
  con: string; nombre: string; avatar: string | null;
  ultima: string; sinLeer: number; total: number;
  vistazo?: string; ultimoMio?: boolean; conectado?: boolean;
}
interface Mensaje {
  id: string; mio: boolean; texto: string | null; fecha: string;
  entregado?: boolean; leido?: boolean; adjunto?: Adjunto | null;
}

/** Subir un archivo y quedarse con lo que devuelve el servidor, que es quien
 *  decide de verdad el tipo. El cuerpo va en crudo: es lo que espera
 *  `/api/uploads` y evita el +33 % de convertirlo a texto. */
async function subir(f: Blob, nombre?: string) {
  const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: f,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || 'No se ha podido subir.');
  return { url: j.url as string, tipo: j.clase as string, nombre: nombre || j.nombre || null };
}

export default function Mensajes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const abierta = params.get('con');
  const { presentes, escribiendo, dispositivo, llamada } = useTelecom();

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [grabando, setGrabando] = useState<number | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const ficheroRef = useRef<HTMLInputElement>(null);
  const grabadora = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);
  const desdeGrabar = useRef(0);

  // La conversación abierta, en una referencia: los oyentes de eventos se
  // registran una vez y necesitan saber cuál es la de AHORA, no la de cuando
  // se registraron.
  const abiertaRef = useRef<string | null>(abierta);
  useEffect(() => { abiertaRef.current = abierta; }, [abierta]);

  // ── MARCAS QUE LLEGAN ANTES DE TIEMPO ───────────────────────────────────
  // Hay una carrera de verdad aquí, y la encontró la prueba automática. Al
  // enviar, el mensaje se pinta al instante con un identificador provisional y
  // el de verdad llega en la respuesta del servidor. Pero el servidor empuja el
  // mensaje a la otra persona ANTES de contestarte a ti; si ella lo lee en ese
  // instante —y con la conversación abierta lo lee en el acto—, el «ya está
  // leído» llega aquí cuando el mensaje todavía se llama «tmp-…» y no le
  // corresponde a nadie. Resultado: un mensaje leído que se queda con una sola
  // marca para siempre.
  //
  // Se apuntan las marcas huérfanas y se aplican en cuanto el mensaje tiene su
  // nombre definitivo. Es un `useRef` y no estado: cambiarlo no tiene que
  // repintar nada por sí solo.
  const marcasHuerfanas = useRef({ entregado: new Set<string>(), leido: new Set<string>() });

  const cargarBandeja = useCallback(() => {
    fetch('/api/mensajes', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setConversaciones(Array.isArray(d?.conversaciones) ? d.conversaciones : []))
      .catch(() => setConversaciones([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { if (user) cargarBandeja(); else setCargando(false); }, [user, cargarBandeja]);

  useEffect(() => {
    if (!abierta) { setMensajes([]); return; }
    fetch(`/api/mensajes/${abierta}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setMensajes(Array.isArray(d?.mensajes) ? d.mensajes : []))
      // Entrar marca como leídos: la cuenta de sin leer cambia, así que se
      // refresca la bandeja.
      .then(cargarBandeja)
      .catch(() => setMensajes([]));
  }, [abierta, cargarBandeja]);

  // ── LO QUE LLEGA SOLO ───────────────────────────────────────────────────
  useEffect(() => {
    const alLlegar = (e: any) => {
      const d = e.detail;
      const suyo = d.mensaje?.mio ? d.con : d.de;   // el hilo al que pertenece
      if (suyo === abiertaRef.current) {
        setMensajes(m => (m.some(x => x.id === d.mensaje.id) ? m : [...m, d.mensaje]));
        // Verlo ES leerlo: se vuelve a pedir la conversación, que es lo que
        // marca leído en el servidor y le pone las marcas azules al otro.
        if (!d.mensaje.mio) {
          fetch(`/api/mensajes/${suyo}`, { credentials: 'include' }).catch(() => {});
        }
      }
      cargarBandeja();
    };
    const alMarcar = (e: any) => {
      const leido = e.type === 'telecom:leidos';
      const ids: string[] = e.detail?.ids || [];
      setMensajes(m => {
        const conocidos = new Set(m.map(x => x.id));
        for (const id of ids) {
          if (!conocidos.has(id)) marcasHuerfanas.current[leido ? 'leido' : 'entregado'].add(id);
        }
        return m.map(x => (ids.includes(x.id)
          ? { ...x, ...(leido ? { leido: true, entregado: true } : { entregado: true }) }
          : x));
      });
    };
    window.addEventListener('telecom:mensaje', alLlegar);
    window.addEventListener('telecom:entregados', alMarcar);
    window.addEventListener('telecom:leidos', alMarcar);
    return () => {
      window.removeEventListener('telecom:mensaje', alLlegar);
      window.removeEventListener('telecom:entregados', alMarcar);
      window.removeEventListener('telecom:leidos', alMarcar);
    };
  }, [cargarBandeja]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  // ── ENVIAR ──────────────────────────────────────────────────────────────
  const enviarCosa = async (t: string, adjunto?: { url: string; tipo: string | null; nombre: string | null; segundos?: number }) => {
    if (!abierta) return;
    setEnviando(true); setError(null);
    const provisional = `tmp-${Date.now()}`;
    // SE PINTA YA Y SE CONFIRMA DESPUÉS: escribir tiene que ir a la velocidad
    // de la mano. Si el servidor lo rechaza, el mensaje se retira y se dice.
    setMensajes(m => [...m, {
      id: provisional, mio: true, texto: t || null, fecha: new Date().toISOString(),
      entregado: false, leido: false, adjunto: adjunto ? { ...adjunto, segundos: adjunto.segundos ?? null } : null,
    }]);
    try {
      const r = await fetch('/api/mensajes', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para: abierta, texto: t, adjunto, dispositivo }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMensajes(m => m.filter(x => x.id !== provisional));
        setError(d?.error || 'No se ha podido enviar.');
        return;
      }
      // Al ponerle su nombre definitivo se recogen las marcas que llegaron
      // mientras todavía se llamaba «tmp-…».
      const yaLeido = marcasHuerfanas.current.leido.delete(d.id);
      const yaEntregado = marcasHuerfanas.current.entregado.delete(d.id) || Boolean(d.entregado);
      setMensajes(m => m.map(x => (x.id === provisional
        ? { ...x, id: d.id, entregado: yaLeido || yaEntregado, leido: yaLeido }
        : x)));
      cargarBandeja();
    } catch {
      setMensajes(m => m.filter(x => x.id !== provisional));
      setError('No se ha podido enviar.');
    } finally { setEnviando(false); }
  };

  const enviar = () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setTexto('');
    enviarCosa(t);
  };

  const elegirFichero = async (f?: File) => {
    if (!f || !abierta) return;
    setSubiendo(true); setError(null);
    try {
      const a = await subir(f, f.name);
      await enviarCosa('', a);
    } catch (e: any) { setError(e.message); }
    finally { setSubiendo(false); }
  };

  // ── LA NOTA DE VOZ ──────────────────────────────────────────────────────
  // `MediaRecorder` no da MP3 en ningún navegador: Chrome y Firefox graban
  // Opus dentro de WebM y Safari graba AAC dentro de MP4. Se manda lo que dé
  // cada uno y el servidor ya admite los dos; convertir a un formato común
  // exigiría un transcodificador en el servidor por cada nota de voz.
  const empezarAGrabar = async () => {
    try {
      const medios = await navigator.mediaDevices.getUserMedia({ audio: true });
      const g = new MediaRecorder(medios);
      trozos.current = [];
      desdeGrabar.current = Date.now();
      g.ondataavailable = ev => { if (ev.data.size) trozos.current.push(ev.data); };
      g.onstop = async () => {
        medios.getTracks().forEach(t => t.stop());
        const segundos = Math.round((Date.now() - desdeGrabar.current) / 1000);
        setGrabando(null);
        // Menos de un segundo es un toque sin querer, no una nota de voz.
        if (segundos < 1 || !trozos.current.length) return;
        setSubiendo(true);
        try {
          const trozo = new Blob(trozos.current, { type: g.mimeType || 'audio/webm' });
          const a = await subir(trozo, 'Nota de voz');
          await enviarCosa('', { ...a, segundos });
        } catch (e: any) { setError(e.message); }
        finally { setSubiendo(false); }
      };
      g.start();
      grabadora.current = g;
      setGrabando(0);
    } catch {
      setError('No he podido usar el micrófono.');
    }
  };
  const pararDeGrabar = () => { grabadora.current?.stop(); grabadora.current = null; };
  useEffect(() => {
    if (grabando === null) return;
    const t = setInterval(() => setGrabando(g => (g === null ? null : g + 1)), 1000);
    return () => clearInterval(t);
  }, [grabando === null]);

  const llamarAhora = async (tipo: 'audio' | 'video') => {
    if (!abierta) return;
    setError(null);
    try { await llamar({ id: abierta, nombre: conQuien?.nombre || 'Persona', avatar: conQuien?.avatar }, tipo); }
    catch (e: any) { setError(e.message); }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto w-full py-20 text-center">
        <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">Inicia sesión para ver tus mensajes.</p>
      </div>
    );
  }

  const conQuien = conversaciones.find(c => c.con === abierta);
  const estaEnLinea = (id: string | null) =>
    Boolean(id && (presentes.includes(id) || conversaciones.find(c => c.con === id)?.conectado));
  const estaEscribiendo = Boolean(abierta && (escribiendo[abierta] || 0) > Date.now());

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <MessageSquare className="w-5 h-5 text-emerald-600" /> Mensajes
        </h1>
        {/* La puerta al número: «con un número encontrarle y escribirle». */}
        <button
          type="button"
          onClick={() => navigate('/telefono')}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" /> Buscar por número
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[17rem_1fr] gap-4">
        {/* Con quién hablas */}
        <aside className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {cargando ? (
            <div className="py-12 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : conversaciones.length === 0 ? (
            <p className="px-4 py-5 text-[11px] text-slate-400 leading-relaxed">
              Todavía no has hablado con nadie. Busca a alguien por su número, o entra
              en el perfil de una persona y pulsa «Escribir».
            </p>
          ) : conversaciones.map(c => (
            <button
              key={c.con}
              onClick={() => setParams({ con: c.con })}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-50 last:border-0 text-left transition-colors',
                c.con === abierta ? 'bg-emerald-50' : 'hover:bg-slate-50')}
            >
              <span className="relative shrink-0">
                {c.avatar
                  ? <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  : <span className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </span>}
                {estaEnLinea(c.con) && (
                  <span title="Conectado" className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-slate-800 truncate">{c.nombre}</span>
                <span className="block text-[10px] text-slate-400 truncate">
                  {(escribiendo[c.con] || 0) > Date.now()
                    ? <span className="text-emerald-600 font-bold">escribiendo…</span>
                    : <>{c.ultimoMio && 'Tú: '}{c.vistazo || `${c.total} mensajes`}</>}
                </span>
              </span>
              {c.sinLeer > 0 && (
                <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 grid place-items-center rounded-full bg-emerald-600 text-white text-[10px] font-black">
                  {c.sinLeer}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* La conversación */}
        <section className="rounded-2xl border border-slate-200 bg-white flex flex-col min-h-[26rem]">
          {!abierta ? (
            <div className="flex-1 grid place-items-center text-center px-6">
              <p className="text-sm text-slate-400">Elige con quién quieres hablar.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900 truncate">
                    {conQuien?.nombre || 'Conversación'}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {estaEscribiendo
                      ? <span className="text-emerald-600 font-bold">escribiendo…</span>
                      : estaEnLinea(abierta) ? 'Conectado' : 'Desconectado'}
                  </span>
                </span>

                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <button
                    type="button" onClick={() => llamarAhora('audio')} disabled={Boolean(llamada)}
                    title="Llamar" aria-label="Llamar"
                    className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 transition-colors"
                  ><Phone className="w-4 h-4" /></button>
                  <button
                    type="button" onClick={() => llamarAhora('video')} disabled={Boolean(llamada)}
                    title="Videollamada" aria-label="Videollamada"
                    className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 transition-colors"
                  ><Video className="w-4 h-4" /></button>
                  {/* Se dice con todas las letras: esto no pasa a escondidas. */}
                  <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-[10px] font-bold text-slate-400" title="Un resumen de cada mensaje se guarda en la memoria de vuestras representaciones del Mundo 3D">
                    <Brain className="w-3 h-3" /> Vuestros agentes recuerdan esto
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {mensajes.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    Todavía no os habéis escrito. Empieza tú.
                  </p>
                )}
                {mensajes.map(m => <Burbuja key={m.id} m={m} />)}
                {estaEscribiendo && (
                  <div className="flex justify-start">
                    <span className="px-3 py-2 rounded-2xl bg-slate-100 text-slate-400 text-xs inline-flex gap-1">
                      <Punto /><Punto retraso="150ms" /><Punto retraso="300ms" />
                    </span>
                  </div>
                )}
                <div ref={finRef} />
              </div>

              {error && (
                <p className="mx-4 mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  {error}
                  <button type="button" onClick={() => setError(null)} className="ml-auto text-amber-600" aria-label="Cerrar aviso"><X className="w-3.5 h-3.5" /></button>
                </p>
              )}

              <div className="border-t border-slate-100 p-3 flex items-end gap-2">
                <input
                  ref={ficheroRef} type="file" className="hidden"
                  onChange={e => { elegirFichero(e.target.files?.[0]); e.target.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => ficheroRef.current?.click()}
                  disabled={subiendo || grabando !== null}
                  title="Adjuntar una foto o un archivo" aria-label="Adjuntar"
                  className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-slate-400 hover:bg-slate-50 hover:text-emerald-700 disabled:opacity-30 transition-colors"
                >
                  {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>

                {grabando !== null ? (
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-black text-rose-700">Grabando · {reloj(grabando)}</span>
                    <span className="ml-auto text-[10px] text-rose-500">Pulsa el cuadrado para enviarla</span>
                  </div>
                ) : (
                  <textarea
                    value={texto}
                    onChange={e => { setTexto(e.target.value); if (abierta) estoyEscribiendo(abierta); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                    rows={2}
                    placeholder="Escribe tu mensaje…"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
                  />
                )}

                {/* EL MICRÓFONO SOLO CUANDO NO HAY NADA ESCRITO, como en
                    cualquier mensajería: con texto en el cuadro, el botón de la
                    derecha tiene que ser enviar y nada más. */}
                {texto.trim() === '' ? (
                  <button
                    type="button"
                    onClick={() => (grabando === null ? empezarAGrabar() : pararDeGrabar())}
                    disabled={subiendo}
                    title={grabando === null ? 'Grabar una nota de voz' : 'Terminar y enviar'}
                    aria-label={grabando === null ? 'Grabar una nota de voz' : 'Terminar y enviar'}
                    className={cn('shrink-0 w-10 h-10 rounded-xl grid place-items-center transition-colors disabled:opacity-40',
                      grabando === null ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-rose-600 text-white hover:bg-rose-700')}
                  >
                    {grabando === null ? <Mic className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={enviar}
                    disabled={enviando}
                    title="Enviar" aria-label="Enviar"
                    className="shrink-0 w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const Punto = ({ retraso }: { retraso?: string }) => (
  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: retraso }} />
);

/** Un mensaje. Con adjunto o sin él, y con sus marcas si es mío. */
function Burbuja({ m }: { m: Mensaje }) {
  const a = m.adjunto;
  return (
    <div className={cn('flex', m.mio ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
        m.mio ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800')}>

        {a?.tipo === 'imagen' && (
          // Se abre en grande en otra pestaña. Un visor propio para esto sería
          // reinventar lo que el navegador ya hace bien.
          <a href={a.url} target="_blank" rel="noopener noreferrer">
            <img src={a.url} alt={a.nombre || 'Imagen'} className="rounded-xl max-h-72 w-auto mb-1" />
          </a>
        )}
        {a?.tipo === 'audio' && (
          <span className="block mb-1">
            <audio src={a.url} controls preload="none" className="w-56 max-w-full" />
            {a.segundos ? <span className={cn('block text-[9px]', m.mio ? 'text-emerald-100' : 'text-slate-400')}>{reloj(a.segundos)}</span> : null}
          </span>
        )}
        {a && a.tipo !== 'imagen' && a.tipo !== 'audio' && (
          <a
            href={a.url} target="_blank" rel="noopener noreferrer"
            className={cn('flex items-center gap-2 mb-1 px-2.5 py-2 rounded-xl',
              m.mio ? 'bg-emerald-700/40' : 'bg-white')}
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold truncate">{a.nombre || 'Archivo'}</span>
          </a>
        )}

        {m.texto && <span className="whitespace-pre-wrap">{m.texto}</span>}

        <span className={cn('flex items-center gap-1 mt-1 text-[9px]', m.mio ? 'text-emerald-100 justify-end' : 'text-slate-400')}>
          {new Date(m.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {/* LAS DOS MARCAS, solo en lo que mandas tú: en lo que recibes no
              significan nada y serían ruido. */}
          {m.mio && (m.leido
            ? <CheckCheck className="w-3 h-3 text-sky-200" aria-label="Leído" />
            : m.entregado
              ? <CheckCheck className="w-3 h-3" aria-label="Entregado" />
              : <Check className="w-3 h-3" aria-label="Enviado" />)}
        </span>
      </div>
    </div>
  );
}
