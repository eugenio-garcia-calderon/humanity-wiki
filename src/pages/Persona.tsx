// ============================================================================
// LA FICHA DE UNA PERSONA — la vista de 360° (2026-08-20).
// ============================================================================
// Nació como «su perfil arriba y el chat abajo, sin cargar el Mundo 3D»
// (Eugenio). En la fase 3 del CRM se convierte en lo que pedía después: «tienes
// que tener complejidad de datos como Salesforce permitiendo conectarlo todo
// con las herramientas y proyectos».
//
// DOS COLUMNAS, y la división no es estética:
//   · IZQUIERDA — QUIÉN ES y QUÉ OS UNE: datos, estado, grupos, sus proyectos,
//     sus tareas, lo que os habéis escrito. Todo esto se LEE de donde ya vive;
//     aquí no se guarda nada de eso.
//   · DERECHA — HABLAR: la conversación con su representación.
//
// Y LA LÍNEA QUE LO ATA TODO: el botón de seguimiento apunta que has hablado y
// puede crear un aviso EN EL CALENDARIO. El CRM no se inventa un sistema de
// recordatorios propio — si lo hiciera, tendrías dos agendas.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  User as UserIcon, Send, Loader2, Brain, FolderKanban, Info, ArrowLeft,
  Mail, Phone, Globe, MapPin, Star, Building2, MessageSquare, ListChecks,
  CalendarDays, Check, Clock, Tag, Bell,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface Persona {
  id: string; nombre: string; rol: string | null; descripcion: string | null;
  foto_url: string | null; icono: string | null;
  email: string | null; telefono: string | null; empresa: string | null;
  web: string | null; ubicacion: string | null; estado: string | null;
  favorito: boolean; etiquetas: string[]; grupo_ids: string[];
  memoria: Array<{ texto: string; created_at?: string }>;
  conversation_id: string | null;
  persona_user_id: string | null;
  ultimo_contacto: string | null;
  proyecto_titulo?: string | null; proyecto_slug?: string | null;
}
interface Turno { mio: boolean; texto: string; fecha?: string }

const ESTADOS: Record<string, { etiqueta: string; clase: string }> = {
  nuevo:      { etiqueta: 'Nuevo',      clase: 'bg-sky-50 text-sky-700 border-sky-200' },
  hablando:   { etiqueta: 'Hablando',   clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  trabajando: { etiqueta: 'Trabajando', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pausa:      { etiqueta: 'En pausa',   clase: 'bg-slate-100 text-slate-600 border-slate-200' },
  cerrado:    { etiqueta: 'Cerrado',    clase: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const dias = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

const haceCuanto = (iso: string | null) => {
  const d = dias(iso);
  if (d === null) return 'nunca';
  if (d < 1) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  if (d < 365) return `hace ${Math.floor(d / 30)} meses`;
  return `hace ${Math.floor(d / 365)} años`;
};

export default function Persona() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState<Persona | null>(null);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [recuerdos, setRecuerdos] = useState<any[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(() => {
    if (!id) return;
    fetch(`/api/personas/${id}/todo`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError(d.error); return; }
        setP(d.persona || null);
        setProyectos(d.proyectos || []);
        setTareas(d.tareas || []);
        setMensajes(d.mensajes || []);
        setEventos(d.eventos || []);
        setRecuerdos(d.recuerdos || []);
        setTurnos(Array.isArray(d.conversacion) ? d.conversacion : []);
      })
      .catch(() => setError('No se ha podido abrir.'))
      .finally(() => setCargando(false));
  }, [id]);
  useEffect(cargar, [cargar]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turnos, pensando]);

  /** Hablar con su representación. Es el MISMO chat de la plataforma, al que
   *  se le cuenta con quién hablas. */
  const enviar = async () => {
    const t = texto.trim();
    if (!t || pensando || !p) return;
    setTexto('');
    setTurnos(x => [...x, { mio: true, texto: t }]);
    setPensando(true);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: t,
          conversation_id: p.conversation_id,
          context: {
            route: `/persona/${p.id}`,
            mirando: `Hablando con ${p.nombre}`,
            juego: { agente: p },
          },
          edit_mode: 'manual', search_web: false,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setTurnos(x => [...x, { mio: false, texto: d?.error || 'No se ha podido responder.' }]); return; }
      if (d.conversation_id && d.conversation_id !== p.conversation_id) {
        setP(a => (a ? { ...a, conversation_id: d.conversation_id } : a));
      }
      setTurnos(x => [...x, { mio: false, texto: d.reply || d.message || '' }]);
    } catch {
      setTurnos(x => [...x, { mio: false, texto: 'No se ha podido responder.' }]);
    } finally { setPensando(false); }
  };

  /** «Ya he hablado» y, si quieres, un aviso en el calendario. */
  const apuntarSeguimiento = async (enDias = 0) => {
    if (!p) return;
    setAvisando(false);
    const r = await fetch(`/api/personas/${p.id}/seguimiento`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias: enDias }),
    }).catch(() => null);
    if (r?.ok) cargar();
  };

  const alternarFavorito = async () => {
    if (!p) return;
    setP(x => (x ? { ...x, favorito: !x.favorito } : x));
    await fetch(`/api/personas/${p.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorito: !p.favorito }),
    }).catch(() => cargar());
  };

  if (!user) return <p className="py-20 text-center text-sm font-bold text-slate-500">Inicia sesión.</p>;
  if (cargando) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  if (error || !p) return <p className="py-20 text-center text-sm font-bold text-slate-500">{error || 'No encontrada.'}</p>;

  const sinHablar = dias(p.ultimo_contacto);
  const frio = sinHablar === null || sinHablar > 30;

  /** Un bloque de la columna izquierda. */
  const Bloque = ({ icono: Icono, titulo, cuantos, children }: {
    icono: any; titulo: string; cuantos?: number; children: React.ReactNode;
  }) => (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50/70 border-b border-slate-100">
        <Icono className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">{titulo}</span>
        {typeof cuantos === 'number' && cuantos > 0 && (
          <span className="text-[9px] font-bold text-slate-300">{cuantos}</span>
        )}
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );

  return (
    <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col px-4 sm:px-6 py-5">
      {/* Cabecera */}
      <div className="shrink-0">
        <Link to="/personas" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Personas
        </Link>

        <div className="flex items-start gap-4 mt-3">
          {p.foto_url ? (
            <img src={p.foto_url} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0" />
          ) : (
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-indigo-100 grid place-items-center text-2xl shrink-0">
              {p.icono || <UserIcon className="w-7 h-7 text-slate-400" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 leading-tight">{p.nombre}</h1>
              <button onClick={alternarFavorito} title={p.favorito ? 'Quitar de favoritas' : 'Marcar favorita'}
                className="p-1 rounded text-slate-300 hover:text-amber-500 transition-colors">
                <Star className={cn('w-4 h-4', p.favorito && 'fill-amber-400 text-amber-400')} />
              </button>
              {p.estado && ESTADOS[p.estado] && (
                <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider', ESTADOS[p.estado].clase)}>
                  {ESTADOS[p.estado].etiqueta}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {[p.rol, p.empresa].filter(Boolean).join(' · ') || 'Sin cargo'}
            </p>

            {/* Cómo contactarla, a un clic */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {p.email && (
                <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  <Mail className="w-3 h-3" />{p.email}
                </a>
              )}
              {p.telefono && (
                <a href={`tel:${p.telefono}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  <Phone className="w-3 h-3" />{p.telefono}
                </a>
              )}
              {p.web && (
                <a href={p.web} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-300 transition-colors">
                  <Globe className="w-3 h-3" />{p.web.replace(/^https?:\/\//, '')}
                </a>
              )}
              {p.ubicacion && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-500">
                  <MapPin className="w-3 h-3" />{p.ubicacion}
                </span>
              )}
              {p.persona_user_id && (
                <Link to={`/mensajes?con=${p.persona_user_id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors">
                  <MessageSquare className="w-3 h-3" /> Escribirle
                </Link>
              )}
            </div>
          </div>

          {/* EL SEGUIMIENTO. En rojo cuando hace más de un mes: es la pregunta
              que un CRM tiene que responder sin que se la hagas. */}
          <div className="shrink-0 relative">
            <button
              onClick={() => setAvisando(v => !v)}
              className={cn('inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors',
                frio ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300')}
            >
              <Clock className="w-3.5 h-3.5" />
              Hablasteis {haceCuanto(p.ultimo_contacto)}
            </button>

            {avisando && (
              <div className="absolute top-11 right-0 w-56 bg-white border border-slate-200 shadow-2xl rounded-xl p-2 z-20">
                <button onClick={() => apuntarSeguimiento(0)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Acabamos de hablar
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <p className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Recuérdamelo en
                </p>
                {[7, 15, 30, 90].map(d => (
                  <button key={d} onClick={() => apuntarSeguimiento(d)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    {d === 7 ? 'una semana' : d === 15 ? 'dos semanas' : d === 30 ? 'un mes' : 'tres meses'}
                  </button>
                ))}
                <p className="px-2.5 pt-1.5 text-[10px] text-slate-400 leading-relaxed">
                  El aviso se crea en tu Calendario, no en un sitio aparte.
                </p>
              </div>
            )}
          </div>
        </div>

        {p.descripcion && (
          <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-3xl">{p.descripcion}</p>
        )}

        {Array.isArray(p.etiquetas) && p.etiquetas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <Tag className="w-3 h-3 text-slate-300" />
            {p.etiquetas.map(e => (
              <span key={e} className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{e}</span>
            ))}
          </div>
        )}

        <p className="mt-3 flex items-start gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed max-w-3xl">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            Lo de la derecha es una <b>representación</b> que has creado tú, no la persona real.
            Sabe lo que le has contado y nada más.
          </span>
        </p>
      </div>

      {/* Dos columnas: lo que os une, y hablar */}
      <div className="flex-1 min-h-0 mt-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* IZQUIERDA: todo lo que la une al resto de la plataforma */}
        <div className="min-h-0 overflow-y-auto space-y-3 pr-1">
          {proyectos.length > 0 && (
            <Bloque icono={FolderKanban} titulo="Proyectos" cuantos={proyectos.length}>
              <div className="flex flex-wrap gap-1.5">
                {proyectos.map(x => (
                  <Link key={x.id} to={`/proyectos/${x.slug}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 hover:border-amber-300 transition-colors">
                    {x.icono && <span>{x.icono}</span>}{x.titulo}
                  </Link>
                ))}
              </div>
            </Bloque>
          )}

          {tareas.length > 0 && (
            <Bloque icono={ListChecks} titulo="Tareas de sus proyectos" cuantos={tareas.length}>
              <ul className="space-y-1">
                {tareas.slice(0, 10).map(t => (
                  <li key={t.id} className={cn('flex items-center gap-1.5 text-[12px]',
                    t.estado === 'hecho' ? 'text-slate-400 line-through' : 'text-slate-700')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                      t.estado === 'hecho' ? 'bg-emerald-500' : t.estado === 'en_curso' ? 'bg-amber-500' : 'bg-slate-300')} />
                    <span className="truncate font-bold">{t.titulo}</span>
                    {t.vence_el && (
                      <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                        {new Date(t.vence_el).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          {eventos.length > 0 && (
            <Bloque icono={CalendarDays} titulo="En el calendario" cuantos={eventos.length}>
              <ul className="space-y-1">
                {eventos.map(e => (
                  <li key={e.id} className="flex items-center gap-1.5 text-[12px] text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span className="truncate font-bold">{e.titulo}</span>
                    <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                      {new Date(e.inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          {mensajes.length > 0 && (
            <Bloque icono={MessageSquare} titulo="Mensajes de verdad" cuantos={mensajes.length}>
              <ul className="space-y-1.5">
                {mensajes.slice(0, 6).map(m => (
                  <li key={m.id} className="text-[11px] leading-snug">
                    <span className={cn('font-black', m.mio ? 'text-emerald-700' : 'text-slate-500')}>
                      {m.mio ? 'Tú' : p.nombre}:
                    </span>{' '}
                    <span className="text-slate-600">{String(m.texto).slice(0, 120)}</span>
                  </li>
                ))}
              </ul>
              {p.persona_user_id && (
                <Link to={`/mensajes?con=${p.persona_user_id}`}
                  className="block mt-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">
                  Ver la conversación entera →
                </Link>
              )}
            </Bloque>
          )}

          {recuerdos.length > 0 && (
            <Bloque icono={Brain} titulo="Lo que recuerda" cuantos={recuerdos.length}>
              <ul className="space-y-1">
                {recuerdos.slice(0, 10).map((m, i) => (
                  <li key={i} className="text-[11px] text-slate-500 leading-snug pl-2 border-l-2 border-slate-100">
                    {m.texto}
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          {!proyectos.length && !tareas.length && !mensajes.length && !recuerdos.length && !eventos.length && (
            <p className="text-xs text-slate-400 italic px-1">
              Todavía no hay nada que os una. Ponla en un proyecto o escríbele y esto se irá llenando solo.
            </p>
          )}
        </div>

        {/* DERECHA: hablar con su representación */}
        <div className="min-h-0 rounded-2xl border border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
              Hablar con {p.nombre}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {turnos.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-8">
                Todavía no habéis hablado. Empieza tú.
              </p>
            )}
            {turnos.map((t, i) => (
              <div key={i} className={cn('flex', t.mio ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                  t.mio ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800')}>
                  {t.texto}
                </div>
              </div>
            ))}
            {pensando && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-slate-100 text-slate-400 text-sm animate-pulse">
                  {p.nombre} está pensando…
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          <div className="border-t border-slate-100 p-2.5 flex items-end gap-2">
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              rows={2}
              placeholder={`Escribe a ${p.nombre}…`}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
            />
            <button onClick={enviar} disabled={pensando || !texto.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center hover:bg-emerald-700 disabled:opacity-40 transition-colors">
              {pensando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
