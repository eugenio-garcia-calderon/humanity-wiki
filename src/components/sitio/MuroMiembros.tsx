import { useEffect, useState } from 'react';
import { Loader2, Lock, Mail, KeyRound, UserPlus, Clock, ShieldOff, Send } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// EL MURO DE UN SITIO CON MIEMBROS (2026-10-05, carril «acceso»)
// ============================================================================
// Lo que ve quien llega a una página «solo miembros» sin poder verla. Va con
// la marca del sitio (su nombre, su logo, su color) y sin mencionar
// humanity.wiki: es la web de otra persona, y su registro también.
//
// El servidor dice POR QUÉ no se ve (`motivo`) y aquí se ofrece lo justo:
//   · 'entrar'    → entrar, crear cuenta o enlace al correo;
//   · 'pendiente' → «tu registro espera aprobación»;
//   · 'bloqueado' → nada que hacer desde aquí;
//   · 'categoria' → eres miembro, pero tu categoría no llega: pedir acceso.
// Lo que viaja del servidor es sólo la marca: ni el título de la página
// privada, ni un adelanto.

export type Muro = {
  motivo: 'entrar' | 'pendiente' | 'bloqueado' | 'categoria' | null;
  sitio: { raiz: string; nombre: string; logo: string | null; icono: string | null; acento: string | null; registro: string; enlace_magico: boolean; mensaje: string | null };
  yo: { nombre: string | null; email: string; estado: string; categoria: string | null } | null;
};

const pedirJson = async (url: string, cuerpo: any) => {
  const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
};

/** Canjea `?acceso=…` (el enlace mágico) si viene en la dirección. */
export function useCanjeEnlace(raiz: string | null | undefined, alEntrar: () => void) {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!raiz) return;
    const u = new URL(window.location.href);
    const token = u.searchParams.get('acceso');
    if (!token) return;
    u.searchParams.delete('acceso');
    // Fuera de la barra de direcciones antes de nada: que no se quede en el
    // historial ni se comparta copiando el enlace.
    window.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
    pedirJson(`/api/sitio-miembros/${encodeURIComponent(raiz)}/enlace/canjear`, { token }).then(({ ok, j }) => {
      if (ok && j.estado === 'activo') alEntrar();
      else setAviso(j.mensaje || j.error || 'Ese enlace ya no vale: pide otro.');
    });
  }, [raiz]);
  return aviso;
}

function Marca({ s }: { s: Muro['sitio'] }) {
  const img = s.logo || (s.icono && /^(https?:|\/)/.test(s.icono) ? s.icono : null);
  return (
    <div className="flex flex-col items-center text-center">
      {img ? <img src={img} alt="" className="h-14 w-14 rounded-2xl object-cover" />
        : s.icono ? <span className="text-5xl leading-none">{s.icono}</span>
        : <span className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-black text-white" style={{ background: s.acento || '#0f172a' }}>{s.nombre.charAt(0).toUpperCase()}</span>}
      <p className="mt-3 text-lg font-black text-slate-900">{s.nombre}</p>
    </div>
  );
}

export default function MuroMiembros({ muro, paginaId, onDentro, enLinea }: {
  muro: Muro;
  /** La página que se quería ver, para «pedir acceso». */
  paginaId?: string;
  /** Al entrar con éxito: vuelve a pedir la página. */
  onDentro: () => void;
  /** Dentro de otra pantalla en vez de ocuparla entera (el formulario de la barra). */
  enLinea?: boolean;
}) {
  const s = muro.sitio;
  const soloInvitacion = s.registro === 'invitacion';
  const [modo, setModo] = useState<'entrar' | 'registro' | 'enlace'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);
  const [devEnlace, setDevEnlace] = useState<string | null>(null);
  const acento = s.acento || '#0f172a';
  const base = `/api/sitio-miembros/${encodeURIComponent(s.raiz)}`;
  // El enlace mágico suele llevar a una página restringida, o sea, aquí.
  const avisoEnlace = useCanjeEnlace(enLinea ? null : s.raiz, onDentro);
  useEffect(() => { if (avisoEnlace) setMensaje({ texto: avisoEnlace, error: true }); }, [avisoEnlace]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true); setMensaje(null); setDevEnlace(null);
    const { ok, status, j } = modo === 'entrar'
      ? await pedirJson(`${base}/entrar`, { email, password })
      : modo === 'registro'
        ? await pedirJson(`${base}/registro`, { email, password, nombre })
        : await pedirJson(`${base}/enlace`, { email, volver: window.location.pathname });
    setOcupado(false);
    if (!ok) {
      if (status === 409 && j.entrar) setModo('entrar');
      setMensaje({ texto: j.error || 'No se ha podido.', error: true });
      return;
    }
    if (modo === 'enlace') { setMensaje({ texto: j.mensaje }); if (j.dev_enlace) setDevEnlace(j.dev_enlace); return; }
    if (j.estado === 'activo') { onDentro(); return; }
    setMensaje({ texto: j.mensaje || 'Listo.' });
  };

  const pedirAcceso = async () => {
    setOcupado(true);
    const { ok, j } = await pedirJson(`${base}/pedir-acceso`, { pagina_id: paginaId });
    setOcupado(false);
    setMensaje({ texto: ok ? j.mensaje : (j.error || 'No se ha podido.'), error: !ok });
  };
  const salir = async () => {
    await pedirJson(`${base}/salir`, {});
    onDentro();
  };

  const caja = (
    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <Marca s={s} />
      {muro.motivo === 'pendiente' ? (
        <div className="mt-5 text-center">
          <Clock className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-sm font-bold text-slate-800">Tu registro está pendiente de aprobación</p>
          <p className="mt-1 text-xs text-slate-500">Te avisaremos cuando te acepten. Puedes cerrar esta página.</p>
          <button onClick={salir} className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-700">Salir</button>
        </div>
      ) : muro.motivo === 'bloqueado' ? (
        <div className="mt-5 text-center">
          <ShieldOff className="mx-auto h-6 w-6 text-rose-500" />
          <p className="mt-2 text-sm font-bold text-slate-800">Tu acceso a este sitio está bloqueado</p>
          <button onClick={salir} className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-700">Salir</button>
        </div>
      ) : muro.motivo === 'categoria' ? (
        <div className="mt-5 text-center">
          <Lock className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm font-bold text-slate-800">Esta página no está incluida en tu acceso</p>
          <p className="mt-1 text-xs text-slate-500">
            Has entrado como {muro.yo?.nombre || muro.yo?.email}{muro.yo?.categoria ? ` (${muro.yo.categoria})` : ''}. Puedes pedir que te la abran.
          </p>
          <button onClick={pedirAcceso} disabled={ocupado}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50" style={{ background: acento }}>
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Pedir acceso
          </button>
          <div><button onClick={salir} className="mt-3 text-xs font-bold text-slate-400 hover:text-slate-700">Entrar con otra cuenta</button></div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-center text-xs text-slate-500">
            {s.mensaje || (modo === 'registro' ? 'Crea tu cuenta para ver el contenido para miembros.' : 'Este contenido es para miembros. Entra para verlo.')}
          </p>
          <div className={cn('mt-5 grid gap-1 rounded-xl bg-slate-100 p-1', s.enlace_magico ? 'grid-cols-3' : 'grid-cols-2')} role="tablist">
            {([['entrar', 'Entrar', KeyRound], ['registro', 'Crear cuenta', UserPlus], ...(s.enlace_magico ? [['enlace', 'Enlace', Mail]] : [])] as const).map(([id, txt, Ic]: any) => (
              <button key={id} type="button" role="tab" aria-selected={modo === id} onClick={() => { setModo(id); setMensaje(null); }}
                className={cn('flex h-9 items-center justify-center gap-1 rounded-lg text-[12px] font-bold transition-colors',
                  modo === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                <Ic className="h-3.5 w-3.5" /> {txt}
              </button>
            ))}
          </div>
          <form onSubmit={enviar} className="mt-4 space-y-2">
            {modo === 'registro' && (
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" autoComplete="name"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-slate-400 sm:text-sm" />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Tu correo" autoComplete="email"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-slate-400 sm:text-sm" />
            {modo !== 'enlace' && (
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={8}
                placeholder={modo === 'registro' ? 'Una contraseña (8 caracteres o más)' : 'Tu contraseña'}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-slate-400 sm:text-sm" />
            )}
            {modo === 'registro' && soloInvitacion && (
              <p className="text-[11px] text-slate-500">Este sitio es solo por invitación: usa el correo con el que te invitaron.</p>
            )}
            <button type="submit" disabled={ocupado}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: acento }}>
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
              {modo === 'entrar' ? 'Entrar' : modo === 'registro' ? 'Crear cuenta' : 'Enviarme un enlace'}
            </button>
          </form>
        </>
      )}
      {mensaje && (
        <p role={mensaje.error ? 'alert' : 'status'} className={cn('mt-3 rounded-xl px-3 py-2 text-xs font-bold', mensaje.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800')}>
          {mensaje.texto}
        </p>
      )}
      {devEnlace && (
        <p className="mt-2 break-all text-[10px] text-slate-400">Desarrollo, sin correo: <a href={devEnlace} className="underline">{devEnlace}</a></p>
      )}
    </div>
  );
  if (enLinea) return caja;
  return <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">{caja}</div>;
}

/**
 * Pide una página de un sitio (`/api/sitio/pagina/:id`) sabiendo de miembros:
 * devuelve la página, o el muro si es «solo miembros» y no se puede ver.
 *
 * Si la página vino escrita en el HTML (`inicial`) y es de un sitio con
 * miembros, se vuelve a pedir con la sesión: el HTML nunca lleva lo de los
 * miembros (lo arma el servidor sin mirar cookies), así que quien ha entrado
 * vería la versión de un anónimo.
 */
export function useLecturaSitio(id: string | undefined, inicial: any | null) {
  const [pagina, setPagina] = useState<any | null>(inicial);
  const [muro, setMuro] = useState<Muro | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no' | 'fallo'>(inicial ? 'ok' : 'cargando');
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    if (!id) return;
    const yaEsta = pagina?.id === id && vuelta === 0;
    if (yaEsta && !pagina?.miembros) return;
    let vivo = true;
    if (!yaEsta) setEstado('cargando');
    fetch(`/api/sitio/pagina/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(async r => {
        if (!vivo) return;
        const j = await r.json().catch(() => ({}));
        if ((r.status === 401 || r.status === 403) && j.muro) { setMuro(j.muro); setPagina(null); setEstado('ok'); return; }
        if (r.status === 404) { setEstado('no'); return; }
        if (!r.ok) { if (!yaEsta) setEstado('fallo'); return; }
        setMuro(null); setPagina(j); setEstado('ok');
        if (!yaEsta) window.scrollTo(0, 0);
      })
      .catch(() => vivo && !yaEsta && setEstado('fallo'));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, vuelta]);
  return { pagina, muro, estado, recargar: () => setVuelta(v => v + 1) };
}
