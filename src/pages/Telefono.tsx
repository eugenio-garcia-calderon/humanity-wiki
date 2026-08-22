import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Video, Search, MessageSquare, Loader2, Check, ShieldAlert, BellRing,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, ScreenShare, Wifi, WifiOff, Contact,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { normalizarTelefono, telefonoLegible } from '../utils/telefono';
import { useTelecom } from '../telecom/useTelecom';
import { llamar, pedirPermisoDeAvisos } from '../telecom/motor';
import { Cara, reloj } from '../components/telecom/piezas';
import ImportarContactos from '../components/social/ImportarContactos';

// ============================================================================
// TELÉFONO (2026-08-22)
// ============================================================================
// Eugenio: «que con un número de la persona le puedas encontrar en la base de
// datos y enviarle un mensaje o llamarle, y le saltará en su aplicación».
//
// Esta pantalla es esa frase, entera y en este orden:
//
//   1. TU NÚMERO. Lo primero, porque sin él lo demás no funciona: nadie te
//      puede encontrar y tu agenda no te reconoce.
//   2. BUSCAR UN NÚMERO. Uno, exacto. No hay búsqueda parcial y no la va a
//      haber: sería un listín telefónico de toda la plataforma.
//   3. TU AGENDA, YA DENTRO. Los contactos que importaste que resulta que
//      están aquí. Es lo que hizo grande a WhatsApp y no se le ocurrió a nadie
//      más: no buscas a nadie, abres y tu gente ya está.
//   4. LO QUE HA PASADO. El historial de llamadas.

interface Persona { id: string; nombre: string; avatar?: string | null; handle?: string | null; conectado?: boolean; telefono?: string }
interface Registro {
  id: string; mia: boolean; con: Persona; tipo: 'audio' | 'video';
  estado: string; segundos: number; pantalla: boolean; fecha: string;
}

const api = async (url: string, opciones?: RequestInit) => {
  const r = await fetch(url, { credentials: 'include', ...opciones });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'No se ha podido.');
  return j;
};

/** Cómo se cuenta una llamada del historial en una línea. */
const comoFue = (l: Registro) => {
  if (l.estado === 'en_curso' || l.estado === 'sonando') return 'Ahora mismo';
  if (l.estado === 'no_contestada') return 'Sin respuesta';
  if (l.estado === 'perdida') return 'Perdida';
  if (l.estado === 'rechazada') return 'La rechazaste';
  if (l.estado === 'cancelada') return 'Cancelada';
  if (l.estado === 'sin_conexion') return l.mia ? 'No estaba conectado' : 'No estabas conectado';
  return l.segundos > 0 ? reloj(l.segundos) : 'Sin duración';
};

export default function Telefono() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conectado, llamada } = useTelecom();

  const [miNumero, setMiNumero] = useState('');
  const [buscable, setBuscable] = useState(true);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorNumero, setErrorNumero] = useState<string | null>(null);
  const [avisosOk, setAvisosOk] = useState<boolean>(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );

  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<{ telefono: string; enMiAgenda: string | null; persona: Persona | null } | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [contactos, setContactos] = useState<Persona[]>([]);
  const [historial, setHistorial] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLlamada, setErrorLlamada] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      const [yo, mis, hist] = await Promise.all([
        api('/api/telecom/yo'),
        api('/api/telecom/mis-contactos').catch(() => ({ contactos: [] })),
        api('/api/telecom/llamadas').catch(() => ({ llamadas: [] })),
      ]);
      setMiNumero(yo?.telefono ? telefonoLegible(yo.telefono) : '');
      setGuardado(yo?.telefono || null);
      setBuscable(yo?.buscable !== false);
      setContactos(mis?.contactos || []);
      setHistorial(hist?.llamadas || []);
    } catch { /* la pantalla se pinta vacía, que es la verdad */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { if (user) cargar(); else setCargando(false); }, [user, cargar]);
  // Al colgar, el historial tiene una línea nueva.
  useEffect(() => {
    const f = () => { setTimeout(() => { api('/api/telecom/llamadas').then(d => setHistorial(d.llamadas || [])).catch(() => {}); }, 400); };
    window.addEventListener('telecom:llamada_terminada', f);
    return () => window.removeEventListener('telecom:llamada_terminada', f);
  }, []);

  const guardarNumero = async () => {
    setGuardando(true); setErrorNumero(null);
    try {
      const d = await api('/api/telecom/mi-numero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: miNumero.trim() || null, buscable }),
      });
      setGuardado(d.telefono);
      setMiNumero(d.telefono ? telefonoLegible(d.telefono) : '');
      // EL PERMISO DE AVISOS SE PIDE AQUÍ Y NO AL ENTRAR EN LA WEB. Aquí acabas
      // de decir «quiero que me llamen», así que la pregunta tiene sentido; al
      // entrar sería un cuadro del navegador antes de haber visto nada.
      if (d.telefono && !avisosOk) setAvisosOk(await pedirPermisoDeAvisos());
      // La agenda se vuelve a cruzar: puede que ahora te reconozcan.
      api('/api/telecom/mis-contactos').then(m => setContactos(m.contactos || [])).catch(() => {});
    } catch (e: any) { setErrorNumero(e.message); }
    finally { setGuardando(false); }
  };

  const buscar = async () => {
    const n = normalizarTelefono(busqueda);
    if (!n) { setErrorBusqueda('Escribe un número con su prefijo: +34 600 123 456.'); setResultado(null); return; }
    setBuscando(true); setErrorBusqueda(null); setResultado(null);
    try {
      setResultado(await api(`/api/telecom/buscar?telefono=${encodeURIComponent(n)}`));
    } catch (e: any) { setErrorBusqueda(e.message); }
    finally { setBuscando(false); }
  };

  const llamarA = async (p: Persona, tipo: 'audio' | 'video') => {
    setErrorLlamada(null);
    try { await llamar({ id: p.id, nombre: p.nombre, avatar: p.avatar }, tipo); }
    catch (e: any) { setErrorLlamada(e.message); }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto w-full py-20 text-center">
        <Phone className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">Inicia sesión para usar el teléfono.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full pb-16">
      <header className="flex items-center gap-2 mb-1">
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Phone className="w-5 h-5 text-emerald-600" /> Teléfono
        </h1>
        <span
          title={conectado ? 'Tu aparato está conectado: te pueden llamar' : 'Sin conexión: no te pueden llamar ahora mismo'}
          className={cn('ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black',
            conectado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}
        >
          {conectado ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {conectado ? 'Conectado' : 'Sin conexión'}
        </span>
      </header>
      <p className="text-xs text-slate-400 mb-6 max-w-2xl leading-relaxed">
        Llamadas y videollamadas dentro de la plataforma. El audio y el vídeo van
        directos de tu navegador al de la otra persona: no pasan por ningún servidor
        nuestro y nadie más puede oírlos.
      </p>

      {errorLlamada && (
        <p className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">{errorLlamada}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── 1. TU NÚMERO ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-black text-slate-900 mb-1">Tu número</h2>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Con él te encuentran quienes te tengan guardado en su agenda, igual que
            en WhatsApp. Puedes quitarlo cuando quieras.
          </p>
          <div className="flex gap-2">
            <input
              value={miNumero}
              onChange={e => setMiNumero(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardarNumero(); }}
              placeholder="+34 600 123 456"
              inputMode="tel"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
            />
            <button
              type="button"
              onClick={guardarNumero}
              disabled={guardando}
              className="px-4 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </div>

          <label className="mt-3 flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={buscable}
              onChange={e => { setBuscable(e.target.checked); }}
              className="mt-0.5 accent-emerald-600"
            />
            <span className="text-[11px] text-slate-500 leading-snug">
              Dejar que me encuentren por mi número.
              <span className="block text-slate-400">Si lo apagas sigues pudiendo llamar y escribir; solo dejas de aparecer en la búsqueda.</span>
            </span>
          </label>

          {errorNumero && <p className="mt-2 text-[11px] font-bold text-rose-600">{errorNumero}</p>}
          {guardado && !errorNumero && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <Check className="w-3 h-3" /> Guardado: {telefonoLegible(guardado)}
            </p>
          )}

          {/* SE DICE LO QUE NO ESTÁ HECHO. Es la regla de la casa y aquí importa
              especialmente, porque afecta a quién puede recibir tus llamadas. */}
          <p className="mt-3 flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-2 leading-snug">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              Todavía no se comprueba con un SMS que el número sea tuyo — no hay
              servicio de SMS contratado. Lo que sí impide líos: un mismo número no
              puede estar en dos cuentas.
            </span>
          </p>

          {!avisosOk && (
            <button
              type="button"
              onClick={async () => setAvisosOk(await pedirPermisoDeAvisos())}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5" />
              Avisarme aunque tenga la pestaña detrás
            </button>
          )}
        </section>

        {/* ── 2. BUSCAR UN NÚMERO ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-black text-slate-900 mb-1">Buscar por número</h2>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Escribe el número entero. Se busca exacto: no hay listas ni búsquedas
            por trozos, a propósito.
          </p>
          <div className="flex gap-2">
            <input
              ref={campo}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') buscar(); }}
              placeholder="+34 600 123 456"
              inputMode="tel"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
            />
            <button
              type="button"
              onClick={buscar}
              disabled={buscando}
              className="px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {errorBusqueda && <p className="mt-2 text-[11px] font-bold text-rose-600">{errorBusqueda}</p>}

          {resultado && !resultado.persona && (
            <div className="mt-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-600">
                {telefonoLegible(resultado.telefono)} no está en la plataforma.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {resultado.enMiAgenda
                  ? `Lo tienes guardado como «${resultado.enMiAgenda}». Puedes escribirle por WhatsApp desde su ficha de contacto.`
                  : 'Nadie ha registrado ese número aquí todavía.'}
              </p>
            </div>
          )}

          {resultado?.persona && (
            <FichaPersona
              persona={{ ...resultado.persona, nombre: resultado.enMiAgenda || resultado.persona.nombre }}
              enLlamada={Boolean(llamada)}
              onEscribir={() => navigate(`/mensajes?con=${resultado.persona!.id}`)}
              onLlamar={t => llamarA(resultado.persona!, t)}
            />
          )}
        </section>
      </div>

      {/* ── 3. TU AGENDA, YA DENTRO ────────────────────────────────────── */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3 flex-wrap mb-1">
          <h2 className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
            <Contact className="w-4 h-4 text-emerald-600" /> De tu agenda, ya están aquí
          </h2>
          <div className="ml-auto"><ImportarContactos onImportado={cargar} /></div>
        </div>
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Se cruzan los números que importaste con los de la gente registrada. Ni tu
          agenda sale de aquí ni se le dice a nadie que le tienes guardado.
        </p>

        {cargando ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : contactos.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            Ninguno de tus contactos tiene todavía su número puesto aquí. Cuando lo
            pongan, aparecerán solos en esta lista.
          </p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {contactos.map(c => (
              <li key={c.id}>
                <FichaPersona
                  persona={c}
                  compacta
                  enLlamada={Boolean(llamada)}
                  onEscribir={() => navigate(`/mensajes?con=${c.id}`)}
                  onLlamar={t => llamarA(c, t)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 4. LO QUE HA PASADO ────────────────────────────────────────── */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-black text-slate-900 mb-3">Últimas llamadas</h2>
        {historial.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">Todavía no has llamado a nadie.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {historial.map(l => {
              const perdida = l.estado === 'perdida' || l.estado === 'no_contestada' || l.estado === 'sin_conexion';
              const Icono = perdida ? PhoneMissed : l.mia ? PhoneOutgoing : PhoneIncoming;
              return (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <Icono className={cn('w-4 h-4 shrink-0', perdida ? 'text-rose-500' : 'text-slate-300')} />
                  <Cara nombre={l.con.nombre} avatar={l.con.avatar} tam="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-slate-800 truncate">{l.con.nombre}</span>
                    <span className="block text-[10px] text-slate-400">
                      {l.tipo === 'video' ? 'Videollamada' : 'Llamada'} · {comoFue(l)}
                      {l.pantalla && <> · <ScreenShare className="w-2.5 h-2.5 inline -mt-px" /> pantalla</>}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(l.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => llamarA(l.con, l.tipo)}
                    disabled={Boolean(llamada)}
                    title={`Volver a llamar a ${l.con.nombre}`}
                    className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Una persona con sus tres botones. Sale en la búsqueda y en la agenda: la
 *  regla de dos dice que vive una vez. */
function FichaPersona({
  persona, onEscribir, onLlamar, compacta, enLlamada,
}: {
  persona: Persona;
  onEscribir: () => void;
  onLlamar: (tipo: 'audio' | 'video') => void;
  compacta?: boolean;
  enLlamada?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3', compacta ? 'py-2.5' : 'mt-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100')}>
      <span className="relative shrink-0">
        <Cara nombre={persona.nombre} avatar={persona.avatar} tam="sm" />
        {/* EL PUNTO VERDE SOLO SI ESTÁ, y no hay punto gris: «no conectado»
            dicho a gritos es información sobre alguien que no ha pedido darla. */}
        {persona.conectado && (
          <span title="Conectado ahora" className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-black text-slate-800 truncate">{persona.nombre}</span>
        <span className="block text-[10px] text-slate-400 truncate">
          {persona.handle ? `@${persona.handle}` : persona.telefono ? telefonoLegible(persona.telefono) : ''}
        </span>
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <BotonFicha icono={MessageSquare} etiqueta={`Escribir a ${persona.nombre}`} onClick={onEscribir} />
        <BotonFicha icono={Phone} etiqueta={`Llamar a ${persona.nombre}`} onClick={() => onLlamar('audio')} desactivado={enLlamada} />
        <BotonFicha icono={Video} etiqueta={`Videollamada con ${persona.nombre}`} onClick={() => onLlamar('video')} desactivado={enLlamada} />
      </div>
    </div>
  );
}

function BotonFicha({ icono: Icono, etiqueta, onClick, desactivado }: { icono: any; etiqueta: string; onClick: () => void; desactivado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactivado}
      title={etiqueta}
      aria-label={etiqueta}
      className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 transition-colors"
    >
      <Icono className="w-4 h-4" />
    </button>
  );
}
