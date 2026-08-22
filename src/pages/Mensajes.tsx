// ============================================================================
// MENSAJES (2026-08-20, petición de Eugenio: «haz mensajería entre personas»).
// ============================================================================
// Dos columnas, como cualquier bandeja: con quién hablas a la izquierda y la
// conversación a la derecha. `?con=<id>` abre una directamente, que es lo que
// usa el botón «Escribir» de un perfil.
//
// Lo que NO se ve aquí y es lo importante: cada mensaje deja un resumen en la
// memoria de las representaciones que cada cual tiene de la otra persona en su
// Mundo 3D. Se dice en la propia pantalla, porque una cosa así no debe pasar a
// escondidas.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, Loader2, User as UserIcon, Brain } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface Conversacion {
  con: string; nombre: string; avatar: string | null;
  ultima: string; sinLeer: number; total: number;
}
interface Mensaje { id: string; mio: boolean; texto: string; fecha: string }

export default function Mensajes() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const abierta = params.get('con');
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const cargarBandeja = () => {
    fetch('/api/mensajes', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setConversaciones(Array.isArray(d?.conversaciones) ? d.conversaciones : []))
      .catch(() => setConversaciones([]))
      .finally(() => setCargando(false));
  };
  useEffect(() => { if (user) cargarBandeja(); else setCargando(false); }, [user]);

  useEffect(() => {
    if (!abierta) { setMensajes([]); return; }
    fetch(`/api/mensajes/${abierta}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setMensajes(Array.isArray(d?.mensajes) ? d.mensajes : []))
      // Entrar marca como leídos: la cuenta de sin leer cambia, así que se
      // refresca la bandeja.
      .then(cargarBandeja)
      .catch(() => setMensajes([]));
  }, [abierta]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !abierta || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch('/api/mensajes', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para: abierta, texto: t }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d?.error || 'No se ha podido enviar.'); return; }
      setTexto('');
      // Se pinta ya y se confirma con el servidor después: escribir tiene que
      // ir a la velocidad de la mano.
      setMensajes(m => [...m, { id: d.id, mio: true, texto: t, fecha: new Date().toISOString() }]);
      cargarBandeja();
    } catch {
      setError('No se ha podido enviar.');
    } finally { setEnviando(false); }
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

  return (
    <div className="max-w-7xl mx-auto w-full">
      <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 mb-4">
        <MessageSquare className="w-5 h-5 text-emerald-600" /> Mensajes
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4">
        {/* Con quién hablas */}
        <aside className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {cargando ? (
            <div className="py-12 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : conversaciones.length === 0 ? (
            <p className="px-4 py-5 text-[11px] text-slate-400 leading-relaxed">
              Todavía no has hablado con nadie. Entra en el perfil de una persona y pulsa «Escribir».
            </p>
          ) : conversaciones.map(c => (
            <button
              key={c.con}
              onClick={() => setParams({ con: c.con })}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-50 last:border-0 text-left transition-colors',
                c.con === abierta ? 'bg-emerald-50' : 'hover:bg-slate-50')}
            >
              {c.avatar
                ? <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                : <span className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-slate-400 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </span>}
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-slate-800 truncate">{c.nombre}</span>
                <span className="block text-[10px] text-slate-400">{c.total} mensajes</span>
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
                <p className="text-sm font-black text-slate-900 truncate">
                  {conQuien?.nombre || 'Conversación'}
                </p>
                {/* Se dice con todas las letras: esto no pasa a escondidas. */}
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-slate-400" title="Un resumen de cada mensaje se guarda en la memoria de vuestras representaciones del Mundo 3D">
                  <Brain className="w-3 h-3" /> Vuestros agentes recuerdan esto
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {mensajes.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    Todavía no os habéis escrito. Empieza tú.
                  </p>
                )}
                {mensajes.map(m => (
                  <div key={m.id} className={cn('flex', m.mio ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                      m.mio ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800')}>
                      {m.texto}
                      <span className={cn('block mt-1 text-[9px]', m.mio ? 'text-emerald-100' : 'text-slate-400')}>
                        {new Date(m.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={finRef} />
              </div>

              {error && (
                <p className="mx-4 mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{error}</p>
              )}

              <div className="border-t border-slate-100 p-3 flex items-end gap-2">
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  rows={2}
                  placeholder="Escribe tu mensaje…"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
                />
                <button
                  onClick={enviar}
                  disabled={enviando || !texto.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
