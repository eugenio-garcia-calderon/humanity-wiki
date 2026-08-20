// ============================================================================
// LA PÁGINA DE UNA PERSONA DE TU MUNDO (2026-08-20, petición de Eugenio:
// «para hablar con alguien haz que no haga falta que cargue el mundo 3D, sino
// que haciendo click en esa persona desde el menú se abra su perfil en la
// parte de arriba junto con el chat de mensajes históricos en la parte de
// abajo»).
// ============================================================================
// Hablar con Anita cargaba el Mundo 3D entero —un megabyte de three.js y toda
// la escena— para lo que en el fondo son una ficha y un chat. Aquí no hay
// escena: perfil arriba, conversación abajo, y se abre al instante.
//
// LO QUE NO SE CALLA: esto es una REPRESENTACIÓN que tú has creado, no la
// persona real. Se dice arriba del todo, porque confundir una cosa con la otra
// es el peor malentendido posible de toda la plataforma.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  User as UserIcon, Send, Loader2, Brain, FolderKanban, Info, ArrowLeft,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface Agente {
  id: string; nombre: string; rol: string | null; descripcion: string | null;
  foto_url: string | null; icono: string | null;
  memoria: Array<{ texto: string; created_at?: string }>;
  conversation_id: string | null;
  proyecto_titulo?: string | null; proyecto_slug?: string | null;
}
interface Turno { mio: boolean; texto: string; fecha?: string }

export default function Persona() {
  const { id } = useParams();
  const { user } = useAuth();
  const [agente, setAgente] = useState<Agente | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setCargando(true);
    fetch(`/api/juego/agentes/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError(d.error); return; }
        setAgente(d.agente || null);
        setTurnos(Array.isArray(d.mensajes) ? d.mensajes : []);
      })
      .catch(() => setError('No se ha podido abrir.'))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turnos, pensando]);

  /** Hablar. Es el MISMO chat de la plataforma, al que se le cuenta con quién
   *  estás hablando: duplicarlo aquí habría significado dos historiales y dos
   *  contadores de gasto para la misma conversación. */
  const enviar = async () => {
    const t = texto.trim();
    if (!t || pensando || !agente) return;
    setTexto('');
    setTurnos(x => [...x, { mio: true, texto: t }]);
    setPensando(true);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: t,
          conversation_id: agente.conversation_id,
          context: {
            route: `/persona/${agente.id}`,
            mirando: `Hablando con ${agente.nombre}`,
            // Este bloque es el que hace que responda COMO ella y no como el
            // asistente genérico de la plataforma (ver `buildSystemPrompt`).
            juego: { agente },
          },
          edit_mode: 'manual',
          search_web: false,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setTurnos(x => [...x, { mio: false, texto: d?.error || 'No se ha podido responder.' }]); return; }
      if (d.conversation_id && d.conversation_id !== agente.conversation_id) {
        setAgente(a => (a ? { ...a, conversation_id: d.conversation_id } : a));
      }
      setTurnos(x => [...x, { mio: false, texto: d.reply || d.message || '' }]);
    } catch {
      setTurnos(x => [...x, { mio: false, texto: 'No se ha podido responder.' }]);
    } finally { setPensando(false); }
  };

  if (!user) {
    return <p className="py-20 text-center text-sm font-bold text-slate-500">Inicia sesión.</p>;
  }
  if (cargando) {
    return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  }
  if (error || !agente) {
    return <p className="py-20 text-center text-sm font-bold text-slate-500">{error || 'No encontrada.'}</p>;
  }

  const memoria = Array.isArray(agente.memoria) ? agente.memoria : [];

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col h-full px-4 sm:px-6 py-6">
      {/* ARRIBA: el perfil */}
      <div className="shrink-0">
        <Link to="/juego" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Mundo 3D
        </Link>

        <div className="flex items-start gap-4 mt-3">
          {agente.foto_url ? (
            <img src={agente.foto_url} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-md shrink-0" />
          ) : (
            <span className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-indigo-100 grid place-items-center text-2xl shrink-0">
              {agente.icono || <UserIcon className="w-8 h-8 text-slate-400" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{agente.nombre}</h1>
            {agente.rol && <p className="text-sm text-slate-500 mt-0.5">{agente.rol}</p>}
            {agente.descripcion && <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{agente.descripcion}</p>}
            {agente.proyecto_slug && (
              <Link to={`/proyectos/${agente.proyecto_slug}`}
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 hover:border-amber-300 transition-colors">
                <FolderKanban className="w-3 h-3" /> {agente.proyecto_titulo}
              </Link>
            )}
          </div>
        </div>

        {/* Lo que NO se calla. */}
        <p className="mt-3 flex items-start gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            Esto es una <b>representación</b> que has creado tú, no la persona real. Sabe lo que
            le has contado y nada más.
          </span>
        </p>

        {memoria.length > 0 && (
          <details className="mt-2 group">
            <summary className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-700">
              <Brain className="w-3.5 h-3.5" /> Lo que recuerda ({memoria.length})
            </summary>
            <ul className="mt-1.5 space-y-1">
              {memoria.slice(-12).reverse().map((m, i) => (
                <li key={i} className="text-[11px] text-slate-500 leading-snug pl-4 border-l-2 border-slate-100">
                  {m.texto}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* ABAJO: la conversación */}
      <div className="flex-1 min-h-0 mt-4 rounded-2xl border border-slate-200 bg-white flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {turnos.length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-8">
              Todavía no habéis hablado. Empieza tú.
            </p>
          )}
          {turnos.map((t, i) => (
            <div key={i} className={cn('flex', t.mio ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                t.mio ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800')}>
                {t.texto}
              </div>
            </div>
          ))}
          {pensando && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-100 text-slate-400 text-sm animate-pulse">
                {agente.nombre} está pensando…
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        <div className="border-t border-slate-100 p-3 flex items-end gap-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            rows={2}
            placeholder={`Escribe a ${agente.nombre}…`}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
          />
          <button
            onClick={enviar}
            disabled={pensando || !texto.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {pensando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
