import { useEffect, useRef, useState } from 'react';
import { Users, Mail, X, Loader2, Link2, Check, ChevronDown, CornerLeftUp, Plus, UserPlus, Settings2, ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// QUIÉN TIENE ACCESO, AL ESTILO NOTION (2026-10-05, carril «acceso», #12)
// ============================================================================
// Una sola caja para tres cosas que se piden en el mismo momento: buscar a una
// persona, elegir un equipo o escribir un correo. Lo que se escribe decide qué
// es: con «@» y un punto, un correo; si no, se busca por nombre.
//
// Debajo, la lista: la dueña arriba, luego personas y equipos con su rol, y las
// invitaciones que esperan a que alguien se registre. Lo que llega heredado de
// la página madre se enseña con su origen y no se toca aquí: se cambia en la
// madre, o se deja de heredar. Un rol que cambias en un sitio y vuelve a salir
// porque viene de otro es la forma más rápida de no fiarse de esta pantalla.
//
// Quien no administra la página ve la lista, sin controles: saber con quién se
// comparte es parte de leerla.

type Rol = 'ver' | 'comentar' | 'editar' | 'admin';
const ROLES: { id: Rol; nombre: string; explica: string }[] = [
  { id: 'ver', nombre: 'Ver', explica: 'Puede leerla.' },
  { id: 'comentar', nombre: 'Comentar', explica: 'Puede leerla y comentar.' },
  { id: 'editar', nombre: 'Editar', explica: 'Puede cambiar el contenido.' },
  { id: 'admin', nombre: 'Administrar', explica: 'Además decide quién entra.' },
];
const nombreRol = (r: string) => ROLES.find(x => x.id === r)?.nombre || r;
const pareceCorreo = (v: string) => /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(v);

type Origen = { id: string; titulo: string } | null;
type Datos = {
  mi_rol: string | null; puede_gestionar: boolean; es_duenyo: boolean; hereda: boolean;
  madre: Origen; duenyo: { id: string; nombre: string; avatar_url: string | null } | null;
  personas: { user_id: string; rol: Rol; nombre: string; avatar_url: string | null; heredado_de: Origen }[];
  equipos: { equipo_id: string; rol: Rol; nombre: string; icono: string | null; miembros: number; heredado_de: Origen }[];
  invitaciones: { id: string; email: string; rol: Rol }[];
  correo_activo: boolean;
};

const json = (r: Response) => r.json().catch(() => ({}));
const pedir = (url: string, metodo: string, cuerpo?: any) => fetch(url, {
  method: metodo, credentials: 'include',
  headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});

function Cara({ nombre, foto, equipo }: { nombre: string; foto?: string | null; equipo?: string | null | true }) {
  if (foto) return <img src={foto} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />;
  if (equipo) return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-[13px] text-indigo-600">
      {typeof equipo === 'string' ? equipo : <Users className="h-3.5 w-3.5" />}
    </span>
  );
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-black text-slate-500">{(nombre || '?').charAt(0).toUpperCase()}</span>;
}

/** El desplegable de rol: los cuatro, con lo que significa cada uno, y quitar. */
function SelectorRol({ valor, onCambio, onQuitar, soloDuenyo, deshabilitado }: {
  valor: Rol; onCambio: (r: Rol) => void; onQuitar?: () => void; soloDuenyo: boolean; deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    window.addEventListener('pointerdown', fuera);
    return () => window.removeEventListener('pointerdown', fuera);
  }, [abierto]);
  return (
    <div ref={caja} className="relative shrink-0">
      <button type="button" disabled={deshabilitado} onClick={() => setAbierto(a => !a)}
        className="flex h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-60 disabled:hover:bg-transparent">
        {nombreRol(valor)} {!deshabilitado && <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {abierto && (
        <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {ROLES.map(r => {
            const bloqueado = r.id === 'admin' && soloDuenyo;
            return (
              <button key={r.id} type="button" disabled={bloqueado}
                onClick={() => { setAbierto(false); onCambio(r.id); }}
                title={bloqueado ? 'Solo quien creó la página puede dar «Administrar».' : undefined}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40">
                <span className="mt-0.5 w-4 shrink-0">{valor === r.id && <Check className="h-3.5 w-3.5 text-emerald-600" />}</span>
                <span>
                  <span className="block text-[12px] font-bold text-slate-800">{r.nombre}</span>
                  <span className="block text-[11px] text-slate-500">{r.explica}</span>
                </span>
              </button>
            );
          })}
          {onQuitar && (
            <button type="button" onClick={() => { setAbierto(false); onQuitar(); }}
              className="mt-1 w-full border-t border-slate-100 px-3 py-2 text-left text-[12px] font-bold text-rose-600 hover:bg-rose-50">
              Quitar el acceso
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PersonasConAcceso({ paginaId }: { paginaId: string }) {
  const [d, setD] = useState<Datos | null>(null);
  const [sinAcceso, setSinAcceso] = useState(false);
  const [texto, setTexto] = useState('');
  const [rolNuevo, setRolNuevo] = useState<Rol>('editar');
  const [personas, setPersonas] = useState<any[]>([]);
  const [misEquipos, setMisEquipos] = useState<any[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [viendoEquipos, setViendoEquipos] = useState(false);
  const reloj = useRef<any>(null);
  const base = `/api/permisos/pagina/${encodeURIComponent(paginaId)}`;

  const cargar = () => fetch(base, { credentials: 'include' })
    .then(async r => { if (!r.ok) { setSinAcceso(true); return; } setD(await r.json()); })
    .catch(() => setSinAcceso(true));
  const cargarEquipos = () => fetch('/api/equipos', { credentials: 'include' })
    .then(r => (r.ok ? r.json() : { equipos: [] })).then(j => setMisEquipos(j.equipos || [])).catch(() => {});
  useEffect(() => { cargar(); cargarEquipos(); }, [paginaId]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); }, [aviso]);

  const escribir = (v: string) => {
    setTexto(v);
    clearTimeout(reloj.current);
    if (pareceCorreo(v) || v.trim().length < 2) { setPersonas([]); return; }
    reloj.current = setTimeout(async () => {
      const r = await fetch(`/api/accesos/buscar-personas?q=${encodeURIComponent(v.trim())}`, { credentials: 'include' });
      const j = await json(r);
      setPersonas(Array.isArray(j.personas) ? j.personas : []);
    }, 250);
  };

  const tras = async (r: Response, ok: string) => {
    const j = await json(r);
    if (!r.ok) setAviso({ texto: j.error || 'No se ha podido.', error: true });
    else setAviso({ texto: ok });
    await cargar();
    return j;
  };

  const anadirPersona = async (userId: string, rol: Rol = rolNuevo) => {
    setOcupado(true);
    await tras(await pedir(`${base}/persona`, 'PUT', { user_id: userId, rol }), 'Hecho.');
    setTexto(''); setPersonas([]); setOcupado(false);
  };
  const anadirEquipo = async (equipoId: string, rol: Rol = rolNuevo) => {
    setOcupado(true);
    await tras(await pedir(`${base}/equipo`, 'PUT', { equipo_id: equipoId, rol }), 'Hecho.');
    setTexto(''); setOcupado(false);
  };
  const invitar = async () => {
    setOcupado(true);
    const r = await pedir(`${base}/invitar`, 'POST', { emails: texto, rol: rolNuevo });
    const j = await json(r);
    setOcupado(false);
    if (!r.ok) { setAviso({ texto: j.error || 'No se ha podido invitar.', error: true }); return; }
    const partes = [
      j.concedidos ? `${j.concedidos} ${j.concedidos === 1 ? 'persona ya tenía cuenta y tiene acceso' : 'personas ya tenían cuenta y tienen acceso'}` : '',
      j.invitados ? (j.invitados === 1 ? '1 invitación queda esperando a que esa persona se registre con su correo' : `${j.invitados} invitaciones quedan esperando a que se registren con su correo`) : '',
    ].filter(Boolean);
    // Sin proveedor de correo no sale ningún correo, y se dice: quien invita
    // tiene que pasar el enlace por su cuenta.
    const sinCorreo = j.invitados && !j.correo_activo ? ' No se ha enviado ningún correo: pásales tú el enlace.' : '';
    setAviso({ texto: (partes.join('. ') || 'Hecho') + '.' + sinCorreo });
    setTexto('');
    cargar();
  };

  const cambiarHerencia = async (hereda: boolean) => {
    if (!hereda && !confirm('La página dejará de recibir los permisos de su madre. Quien tenía acceso por herencia lo conserva, copiado aquí, y podrás quitarlo a mano. ¿Seguimos?')) return;
    await tras(await pedir(`${base}/herencia`, 'PUT', { hereda }), hereda ? 'Vuelve a heredar de su madre.' : 'Ahora tiene sus propios permisos.');
  };

  const copiarEnlace = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/paginas/${paginaId}`); } catch { /* sin permiso */ }
    setCopiado(true); setTimeout(() => setCopiado(false), 1600);
  };

  if (sinAcceso) return null;
  if (!d) return <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando quién tiene acceso…</div>;
  if (viendoEquipos) return <Equipos onVolver={() => { setViendoEquipos(false); cargarEquipos(); cargar(); }} />;

  const gestiona = d.puede_gestionar;
  const soloDuenyo = !d.es_duenyo;
  const yaEquipo = new Set(d.equipos.filter(e => !e.heredado_de).map(e => e.equipo_id));
  const equiposQueCasan = texto.trim() && !pareceCorreo(texto)
    ? misEquipos.filter(e => !yaEquipo.has(e.id) && e.nombre.toLowerCase().includes(texto.trim().toLowerCase()))
    : [];
  const hayLista = d.personas.length + d.equipos.length + d.invitaciones.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-700">Personas con acceso</p>
        <button type="button" onClick={copiarEnlace}
          className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100">
          {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
          {copiado ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>

      {gestiona && (
        <>
          <div className="relative flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <input value={texto} onChange={e => escribir(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && pareceCorreo(texto)) invitar(); }}
                placeholder="Nombre, equipo o correos separados por comas"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-emerald-300 sm:text-sm" />
              {(personas.length > 0 || equiposQueCasan.length > 0) && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  {equiposQueCasan.map(e => (
                    <button key={e.id} type="button" onClick={() => anadirEquipo(e.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                      <Cara nombre={e.nombre} equipo={e.icono || true} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{e.nombre}</span>
                      <span className="text-[11px] text-slate-400">equipo · {e.miembros}</span>
                    </button>
                  ))}
                  {personas.map(p => (
                    <button key={p.id} type="button" onClick={() => anadirPersona(p.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                      <Cara nombre={p.nombre} foto={p.avatar_url} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{p.nombre}</span>
                      <span className="text-[11px] text-slate-400">{nombreRol(rolNuevo)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <SelectorRol valor={rolNuevo} onCambio={setRolNuevo} soloDuenyo={soloDuenyo} />
            {pareceCorreo(texto) && (
              <button type="button" onClick={invitar} disabled={ocupado}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Invitar
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Quien aún no tiene cuenta queda invitado: al registrarse con ese correo, la página aparece en su lista.
          </p>
        </>
      )}

      {aviso && (
        <p className={cn('mt-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold', aviso.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800')}>
          {aviso.texto}
        </p>
      )}

      <div className="mt-2 space-y-0.5">
        {d.duenyo && (
          <div className="flex items-center gap-2 rounded-lg px-1 py-1.5">
            <Cara nombre={d.duenyo.nombre} foto={d.duenyo.avatar_url} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{d.duenyo.nombre}</span>
            <span className="px-2 text-[12px] font-bold text-slate-400">Dueña o dueño</span>
          </div>
        )}
        {d.equipos.map(e => (
          <div key={`e-${e.equipo_id}`} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
            <Cara nombre={e.nombre} equipo={e.icono || true} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-slate-700">{e.nombre}</span>
              <span className="block truncate text-[11px] text-slate-400">
                Equipo · {e.miembros} {e.miembros === 1 ? 'persona' : 'personas'}{e.heredado_de && ` · heredado de «${e.heredado_de.titulo}»`}
              </span>
            </span>
            <SelectorRol valor={e.rol} soloDuenyo={soloDuenyo} deshabilitado={!gestiona || !!e.heredado_de}
              onCambio={r => anadirEquipo(e.equipo_id, r)}
              onQuitar={async () => tras(await pedir(`${base}/equipo/${e.equipo_id}`, 'DELETE'), 'Quitado.')} />
          </div>
        ))}
        {d.personas.map(p => (
          <div key={`p-${p.user_id}`} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
            <Cara nombre={p.nombre} foto={p.avatar_url} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-slate-700">{p.nombre}</span>
              {p.heredado_de && <span className="block truncate text-[11px] text-slate-400">Heredado de «{p.heredado_de.titulo}»</span>}
            </span>
            <SelectorRol valor={p.rol} soloDuenyo={soloDuenyo}
              deshabilitado={!gestiona || !!p.heredado_de || (p.rol === 'admin' && soloDuenyo)}
              onCambio={r => anadirPersona(p.user_id, r)}
              onQuitar={async () => tras(await pedir(`${base}/persona/${p.user_id}`, 'DELETE'), 'Quitado.')} />
          </div>
        ))}
        {d.invitaciones.map(i => (
          <div key={`i-${i.id}`} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600"><Mail className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-slate-700">{i.email}</span>
              <span className="block text-[11px] text-amber-700">Invitación pendiente · {nombreRol(i.rol)}</span>
            </span>
            {gestiona && (
              <button type="button" onClick={async () => tras(await pedir(`${base}/invitacion/${i.id}`, 'DELETE'), 'Invitación retirada.')}
                aria-label={`Retirar la invitación a ${i.email}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {!hayLista && <p className="px-1 py-1 text-[11px] text-slate-400">Nadie más tiene acceso todavía.</p>}
      </div>

      {d.madre && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
          <CornerLeftUp className="h-4 w-4 shrink-0 text-slate-400" />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-600">
            {d.hereda
              ? <>Hereda los permisos de <a href={`/paginas/${d.madre.id}`} className="font-bold underline">«{d.madre.titulo}»</a>.</>
              : <>Tiene sus propios permisos; no hereda de <a href={`/paginas/${d.madre.id}`} className="font-bold underline">«{d.madre.titulo}»</a>.</>}
          </p>
          {gestiona && (
            <button type="button" onClick={() => cambiarHerencia(!d.hereda)}
              className="h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100">
              {d.hereda ? 'Dejar de heredar' : 'Volver a heredar'}
            </button>
          )}
        </div>
      )}

      {gestiona && (
        <button type="button" onClick={() => setViendoEquipos(true)}
          className="mt-2 flex h-9 items-center gap-1.5 rounded-lg px-1 text-[11px] font-bold text-slate-500 hover:text-slate-800">
          <Settings2 className="h-3.5 w-3.5" /> Mis equipos
        </button>
      )}
    </div>
  );
}

// ── LOS EQUIPOS ─────────────────────────────────────────────────────────────
// Crear uno y meter gente, dentro del mismo diálogo: es donde se echa de menos.

function Equipos({ onVolver }: { onVolver: () => void }) {
  const [equipos, setEquipos] = useState<any[] | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [busca, setBusca] = useState('');
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [fallo, setFallo] = useState<string | null>(null);
  const reloj = useRef<any>(null);

  const cargar = () => fetch('/api/equipos', { credentials: 'include' }).then(r => r.json()).then(j => setEquipos(j.equipos || [])).catch(() => setEquipos([]));
  const cargarMiembros = (id: string) => fetch(`/api/equipos/${id}/miembros`, { credentials: 'include' }).then(r => r.json()).then(j => setMiembros(j.miembros || []));
  useEffect(() => { cargar(); }, []);
  useEffect(() => { if (abierto) cargarMiembros(abierto); }, [abierto]);

  const crear = async () => {
    if (!nombre.trim()) return;
    const r = await pedir('/api/equipos', 'POST', { nombre });
    const j = await json(r);
    if (!r.ok) { setFallo(j.error); return; }
    setNombre(''); setAbierto(j.id); cargar();
  };
  const buscar = (v: string) => {
    setBusca(v);
    clearTimeout(reloj.current);
    if (v.trim().length < 2) { setCandidatos([]); return; }
    reloj.current = setTimeout(async () => {
      const j = await json(await fetch(`/api/accesos/buscar-personas?q=${encodeURIComponent(v.trim())}`, { credentials: 'include' }));
      setCandidatos(j.personas || []);
    }, 250);
  };
  const meter = async (userId: string) => {
    const r = await pedir(`/api/equipos/${abierto}/miembros`, 'PUT', { user_id: userId });
    if (!r.ok) setFallo((await json(r)).error);
    setBusca(''); setCandidatos([]); cargarMiembros(abierto!); cargar();
  };
  const sacar = async (userId: string) => {
    const r = await pedir(`/api/equipos/${abierto}/miembros/${userId}`, 'DELETE');
    if (!r.ok) setFallo((await json(r)).error);
    cargarMiembros(abierto!); cargar();
  };
  const elegido = equipos?.find(e => e.id === abierto);

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <button type="button" onClick={abierto ? () => setAbierto(null) : onVolver}
        className="mb-2 flex h-9 items-center gap-1.5 rounded-lg px-1 text-[12px] font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> {abierto ? 'Todos mis equipos' : 'Volver a compartir'}
      </button>
      {fallo && <p className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700">{fallo}</p>}
      {!abierto ? (
        <>
          <p className="text-xs font-black text-slate-700">Mis equipos</p>
          <p className="mb-2 text-[11px] text-slate-400">Un equipo es un grupo de personas al que das acceso de una vez. Quien entra en el equipo ve lo que el equipo ve.</p>
          <div className="flex gap-1.5">
            <input value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && crear()}
              placeholder="Nombre del equipo nuevo"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-emerald-300 sm:text-sm" />
            <button type="button" onClick={crear} disabled={!nombre.trim()}
              className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-40">
              <Plus className="h-4 w-4" /> Crear
            </button>
          </div>
          <div className="mt-2 space-y-0.5">
            {equipos === null && <p className="text-[11px] text-slate-400">Cargando…</p>}
            {equipos?.length === 0 && <p className="text-[11px] text-slate-400">Todavía no tienes equipos.</p>}
            {equipos?.map(e => (
              <button key={e.id} type="button" onClick={() => setAbierto(e.id)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-slate-50">
                <Cara nombre={e.nombre} equipo={e.icono || true} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{e.nombre}</span>
                <span className="text-[11px] text-slate-400">{e.miembros} {e.miembros === 1 ? 'persona' : 'personas'}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-black text-slate-700">{elegido?.nombre}</p>
          {elegido?.mi_rol === 'admin' && (
            <div className="relative mt-2">
              <input value={busca} onChange={e => buscar(e.target.value)} placeholder="Añadir a alguien por su nombre"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-emerald-300 sm:text-sm" />
              {candidatos.length > 0 && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  {candidatos.map(c => (
                    <button key={c.id} type="button" onClick={() => meter(c.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                      <Cara nombre={c.nombre} foto={c.avatar_url} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{c.nombre}</span>
                      <UserPlus className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-2 space-y-0.5">
            {miembros.map(m => (
              <div key={m.user_id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                <Cara nombre={m.nombre} foto={m.avatar_url} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{m.nombre}</span>
                <span className="text-[11px] text-slate-400">{m.rol === 'admin' ? 'Administra' : 'Miembro'}</span>
                {elegido?.mi_rol === 'admin' && (
                  <button type="button" onClick={() => sacar(m.user_id)} aria-label={`Sacar a ${m.nombre}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
