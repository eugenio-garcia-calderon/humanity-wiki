// ============================================================================
// PERSONAS — el CRM (2026-08-20, petición de Eugenio: «crea una página donde
// se puedan ver todas […] permite crear grupos […] y ponerlo como favoritos
// […] esto es como un CRM, tienes que tener complejidad de datos como
// Salesforce permitiendo conectarlo todo con las herramientas y proyectos»).
// ============================================================================
// FASES 1 y 2: la tabla de gente, la ficha con sus datos, y los grupos.
//
// ES UNA TABLA, NO UNA REJILLA DE TARJETAS. A un CRM no vienes a mirar caras:
// vienes a encontrar a alguien concreto entre muchos, y a comparar filas
// (quién es de qué empresa, en qué punto está, cuánto hace que no habláis).
// Eso lo hace una tabla y no lo hace una rejilla.
//
// LO QUE NO SE GUARDA AQUÍ: los proyectos, los mensajes y lo que recuerda su
// representación se leen de donde ya viven. Una persona no es una copia de
// datos, es un cruce.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users2, Search, Plus, Loader2, Star, Mail, Phone, Building2, X, Check,
  MoreHorizontal, Trash2, MessageSquare, Tag, FolderKanban, Brain, Pencil,
  Rows3, LayoutGrid, MapPin,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface Persona {
  id: string; nombre: string; rol: string | null; descripcion: string | null;
  foto_url: string | null; icono: string | null;
  email: string | null; telefono: string | null; empresa: string | null;
  web: string | null; ubicacion: string | null; estado: string | null;
  favorito: boolean; etiquetas: string[]; grupo_ids: string[];
  proyecto_titulo: string | null; proyecto_slug: string | null;
  persona_user_id: string | null; cuenta_nombre: string | null;
  ultimo_contacto: string | null; recuerdos: number; mensajes: number;
}
interface Grupo {
  id: string; nombre: string; icono: string | null; color: string | null;
  favorito: boolean; descripcion: string | null; cuantos: number;
}

/** En qué punto estás con alguien. Es lo que convierte una agenda en un CRM:
 *  no «quién es», sino «qué toca ahora». */
const ESTADOS: Record<string, { etiqueta: string; clase: string }> = {
  nuevo:      { etiqueta: 'Nuevo',       clase: 'bg-sky-50 text-sky-700 border-sky-200' },
  hablando:   { etiqueta: 'Hablando',    clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  trabajando: { etiqueta: 'Trabajando',  clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pausa:      { etiqueta: 'En pausa',    clase: 'bg-slate-100 text-slate-600 border-slate-200' },
  cerrado:    { etiqueta: 'Cerrado',     clase: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const iniciales = (t: string) =>
  t.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '·';

const haceCuanto = (iso: string | null) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} d`;
  if (d < 365) return `hace ${Math.floor(d / 30)} m`;
  return `hace ${Math.floor(d / 365)} a`;
};

export default function Personas() {
  const { user } = useAuth();
  const navegar = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupoActivo, setGrupoActivo] = useState<string | null>(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [ficha, setFicha] = useState<Partial<Persona> | null>(null);
  const [nuevoGrupo, setNuevoGrupo] = useState<string | null>(null);
  const [menuFila, setMenuFila] = useState<string | null>(null);

  // CÓMO SE MIRAN (Eugenio, 2026-08-20: «ponme diferentes formas de ver los
  // contactos, en forma de galería con fotos en mini tarjetas, o en formato de
  // tabla con las variables de cada contacto en las columnas»).
  //
  // Los mismos datos, dos maneras: la TABLA para trabajar —encontrar a alguien
  // entre muchos y comparar columnas— y la GALERÍA para reconocer por la cara,
  // que es como funciona la memoria con la gente que ya conoces. La elección
  // se recuerda: cada cual mira de una forma y no hay que repetirla cada vez.
  const [modo, setModo] = useState<'tabla' | 'galeria'>(() => {
    try { return localStorage.getItem('humanity:personas-vista') === 'galeria' ? 'galeria' : 'tabla'; }
    catch { return 'tabla'; }
  });
  const cambiarModo = (m: 'tabla' | 'galeria') => {
    setModo(m);
    try { localStorage.setItem('humanity:personas-vista', m); } catch { /* lleno */ }
  };

  const cargar = useCallback(() => {
    if (!user) { setCargando(false); return; }
    const p = new URLSearchParams();
    if (busqueda.trim()) p.set('q', busqueda.trim());
    if (grupoActivo) p.set('grupo', grupoActivo);
    if (soloFavoritos) p.set('favoritos', '1');
    fetch(`/api/personas?${p}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError(d.error); return; }
        setError(null);
        setPersonas(Array.isArray(d.personas) ? d.personas : []);
        setGrupos(Array.isArray(d.grupos) ? d.grupos : []);
      })
      .catch(() => setError('No se han podido cargar las personas.'))
      .finally(() => setCargando(false));
  }, [user, busqueda, grupoActivo, soloFavoritos]);

  // Se espera un poco al escribir: una consulta por tecla es una consulta por
  // tecla.
  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 250 : 0);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  const guardarFicha = async () => {
    if (!ficha) return;
    const nombre = String(ficha.nombre || '').trim();
    if (!nombre) { setError('Ponle un nombre.'); return; }
    const cuerpo = {
      nombre, rol: ficha.rol || null, empresa: ficha.empresa || null,
      email: ficha.email || null, telefono: ficha.telefono || null,
      web: ficha.web || null, ubicacion: ficha.ubicacion || null,
      estado: ficha.estado || null, descripcion: ficha.descripcion || null,
      grupo_ids: ficha.grupo_ids || [],
      etiquetas: ficha.etiquetas || [],
    };
    const r = ficha.id
      ? await fetch(`/api/personas/${ficha.id}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
        })
      : await fetch('/api/personas', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
        });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d?.error || 'No se ha podido guardar.'); return; }
    setFicha(null);
    setError(null);
    cargar();
    window.dispatchEvent(new Event('humanity:menu-cambiado'));
  };

  const alternarFavorito = async (p: Persona) => {
    setPersonas(xs => xs.map(x => (x.id === p.id ? { ...x, favorito: !x.favorito } : x)));
    await fetch(`/api/personas/${p.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorito: !p.favorito }),
    }).catch(() => cargar());
  };

  const quitar = async (p: Persona) => {
    setPersonas(xs => xs.filter(x => x.id !== p.id));
    setMenuFila(null);
    await fetch(`/api/personas/${p.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => cargar());
    window.dispatchEvent(new Event('humanity:menu-cambiado'));
  };

  const crearGrupo = async () => {
    const nombre = (nuevoGrupo || '').trim();
    if (!nombre) return;
    const r = await fetch('/api/grupos-personas', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    }).catch(() => null);
    if (!r?.ok) { setError('No se ha podido crear el grupo.'); return; }
    setNuevoGrupo(null);
    cargar();
  };

  const alternarGrupoFavorito = async (g: Grupo) => {
    setGrupos(xs => xs.map(x => (x.id === g.id ? { ...x, favorito: !x.favorito } : x)));
    await fetch(`/api/grupos-personas/${g.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorito: !g.favorito }),
    }).catch(() => cargar());
    window.dispatchEvent(new Event('humanity:menu-cambiado'));
  };

  const conteo = useMemo(() => personas.length, [personas]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto w-full py-20 text-center">
        <Users2 className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">Inicia sesión para ver tus personas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Users2 className="w-5 h-5 text-emerald-600" /> Personas
        </h1>
        {!cargando && <span className="text-xs font-bold text-slate-400">{conteo}</span>}

        <div className="flex-1 min-w-[6rem]" />

        <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
          {([['tabla', 'Tabla', Rows3], ['galeria', 'Galería', LayoutGrid]] as const).map(([k, etiqueta, Icono]) => (
            <button key={k} onClick={() => cambiarModo(k)} title={etiqueta}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors',
                modo === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              <Icono className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{etiqueta}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setSoloFavoritos(v => !v)}
          title="Solo las favoritas"
          className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors',
            soloFavoritos ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}
        >
          <Star className={cn('w-3.5 h-3.5', soloFavoritos && 'fill-amber-400')} /> Favoritas
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 focus-within:border-emerald-300">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre, empresa, correo…"
            className="w-44 sm:w-64 text-xs text-slate-700 bg-transparent focus:outline-none"
          />
        </div>

        <button
          onClick={() => setFicha({ nombre: '', grupo_ids: [] })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva persona
        </button>
      </div>

      {/* LOS GRUPOS, como filtros. La estrella los pone en el menú lateral. */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button
          onClick={() => setGrupoActivo(null)}
          className={cn('px-3 py-1 rounded-full text-xs font-bold transition-colors border',
            grupoActivo === null ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}
        >
          Todas
        </button>
        {grupos.map(g => (
          <div key={g.id} className="group inline-flex items-center">
            <button
              onClick={() => setGrupoActivo(a => (a === g.id ? null : g.id))}
              className={cn('inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-l-full text-xs font-bold transition-colors border border-r-0',
                grupoActivo === g.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}
            >
              {g.icono && <span className="text-[13px] leading-none">{g.icono}</span>}
              {g.nombre}
              <span className="opacity-50">{g.cuantos}</span>
            </button>
            <button
              onClick={() => alternarGrupoFavorito(g)}
              title={g.favorito ? 'Quitar del menú lateral' : 'Poner en el menú lateral'}
              className={cn('px-2 py-1 rounded-r-full border text-xs transition-colors',
                grupoActivo === g.id ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 hover:border-slate-300')}
            >
              <Star className={cn('w-3 h-3', g.favorito ? 'fill-amber-400 text-amber-400' : grupoActivo === g.id ? 'text-white/50' : 'text-slate-300')} />
            </button>
          </div>
        ))}

        {nuevoGrupo === null ? (
          <button
            onClick={() => setNuevoGrupo('')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-xs font-bold text-slate-400 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
          >
            <Plus className="w-3 h-3" /> Grupo
          </button>
        ) : (
          <form onSubmit={e => { e.preventDefault(); crearGrupo(); }} className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={nuevoGrupo}
              onChange={e => setNuevoGrupo(e.target.value)}
              onBlur={() => { if (!nuevoGrupo.trim()) setNuevoGrupo(null); }}
              placeholder="Clientes, Aldea…"
              className="w-32 px-2.5 py-1 rounded-full border border-emerald-300 text-xs focus:outline-none"
            />
            <button type="submit" className="p-1 text-emerald-600 hover:text-emerald-800"><Check className="w-3.5 h-3.5" /></button>
          </form>
        )}
      </div>

      {error && (
        <p className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{error}</p>
      )}

      {/* LA TABLA */}
      {cargando ? (
        <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : personas.length === 0 ? (
        <div className="py-20 text-center">
          <Users2 className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-500">
            {busqueda || grupoActivo || soloFavoritos ? 'Nadie con esos criterios.' : 'Todavía no tienes a nadie.'}
          </p>
          {!busqueda && !grupoActivo && !soloFavoritos && (
            <button onClick={() => setFicha({ nombre: '', grupo_ids: [] })}
              className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800">
              Añadir la primera →
            </button>
          )}
        </div>
      ) : modo === 'galeria' ? (
        /* GALERÍA: la cara primero. Para cuando reconoces a la gente antes por
           la foto que por el nombre — que es casi siempre. */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {personas.map(p => (
            <div key={p.id} className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all">
              <button onClick={() => navegar(`/persona/${p.id}`)} className="w-full text-left">
                <div className="aspect-[4/3] bg-slate-50 grid place-items-center overflow-hidden">
                  {p.foto_url
                    ? <img src={p.foto_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <span className="text-3xl font-black text-slate-300">{p.icono || iniciales(p.nombre)}</span>}
                </div>
                <div className="p-2.5">
                  <p className="text-[13px] font-black text-slate-900 truncate flex items-center gap-1">
                    {p.nombre}
                    {p.favorito && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                  </p>
                  {(p.rol || p.empresa) && (
                    <p className="text-[11px] text-slate-400 truncate">
                      {[p.rol, p.empresa].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {p.estado && ESTADOS[p.estado] && (
                      <span className={cn('px-1.5 py-px rounded-full border text-[8px] font-black uppercase tracking-wider', ESTADOS[p.estado].clase)}>
                        {ESTADOS[p.estado].etiqueta}
                      </span>
                    )}
                    {p.ultimo_contacto && (
                      <span className="text-[9px] font-bold text-slate-400">{haceCuanto(p.ultimo_contacto)}</span>
                    )}
                  </div>
                  {Array.isArray(p.etiquetas) && p.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.etiquetas.slice(0, 3).map(e => (
                        <span key={e} className="px-1.5 py-px rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              </button>

              {/* Las mismas acciones que en la tabla: cambiar de vista no
                  puede quitarte lo que podías hacer. */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                <button onClick={() => alternarFavorito(p)} title={p.favorito ? 'Quitar de favoritas' : 'Marcar favorita'}
                  className="w-7 h-7 grid place-items-center rounded-lg bg-black/25 backdrop-blur text-white/80 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-all">
                  <Star className={cn('w-3.5 h-3.5', p.favorito && 'fill-amber-400 text-amber-400')} />
                </button>
                <button onClick={() => setMenuFila(m => (m === p.id ? null : p.id))} title="Opciones"
                  className={cn('w-7 h-7 grid place-items-center rounded-lg bg-black/25 backdrop-blur text-white/80 transition-all',
                    menuFila === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
              {menuFila === p.id && (
                <div className="absolute top-10 right-1.5 w-44 bg-white border border-slate-200 shadow-2xl rounded-xl py-1 z-20">
                  <button onClick={() => { setMenuFila(null); navegar(`/persona/${p.id}`); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Abrir y hablar
                  </button>
                  <button onClick={() => { setMenuFila(null); setFicha({ ...p }); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                    <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar ficha
                  </button>
                  <button onClick={() => quitar(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-left">
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" /> Quitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.4fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-slate-50/70 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
            <span>Persona</span><span>Empresa y contacto</span><span>Estado</span><span>Conexión</span><span />
          </div>
          {personas.map(p => (
            <div key={p.id}
              className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors items-center group">
              {/* Quién */}
              <button onClick={() => navegar(`/persona/${p.id}`)} className="flex items-center gap-2.5 min-w-0 text-left">
                {p.foto_url
                  ? <img src={p.foto_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  : <span className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-[11px] font-black text-slate-500 shrink-0">
                      {p.icono || iniciales(p.nombre)}
                    </span>}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-black text-slate-800 truncate">{p.nombre}</span>
                    {p.favorito && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                    {p.persona_user_id && (
                      <span title="Tiene cuenta en la plataforma"
                        className="px-1.5 py-px rounded-full bg-emerald-50 text-[8px] font-black uppercase tracking-wider text-emerald-700 shrink-0">
                        cuenta
                      </span>
                    )}
                  </span>
                  {p.rol && <span className="block text-[11px] text-slate-400 truncate">{p.rol}</span>}
                  {Array.isArray(p.etiquetas) && p.etiquetas.length > 0 && (
                    <span className="flex flex-wrap gap-1 mt-0.5">
                      {p.etiquetas.slice(0, 3).map(e => (
                        <span key={e} className="px-1.5 py-px rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">{e}</span>
                      ))}
                    </span>
                  )}
                </span>
              </button>

              {/* Empresa y contacto */}
              <div className="min-w-0 text-[11px] text-slate-500 space-y-0.5">
                {p.empresa && (
                  <p className="flex items-center gap-1 truncate"><Building2 className="w-3 h-3 shrink-0 text-slate-300" />{p.empresa}</p>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 truncate hover:text-emerald-700">
                    <Mail className="w-3 h-3 shrink-0 text-slate-300" />{p.email}
                  </a>
                )}
                {p.telefono && (
                  <p className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 shrink-0 text-slate-300" />{p.telefono}</p>
                )}
              </div>

              {/* Estado */}
              <div className="min-w-0">
                {p.estado && ESTADOS[p.estado] && (
                  <span className={cn('inline-block px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider', ESTADOS[p.estado].clase)}>
                    {ESTADOS[p.estado].etiqueta}
                  </span>
                )}
                {p.ultimo_contacto && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{haceCuanto(p.ultimo_contacto)}</p>
                )}
              </div>

              {/* Lo que la une al resto: esto es el CRM */}
              <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400">
                {p.proyecto_slug && (
                  <span title={`Proyecto: ${p.proyecto_titulo}`} className="inline-flex items-center gap-0.5 truncate">
                    <FolderKanban className="w-3 h-3" />{p.proyecto_titulo}
                  </span>
                )}
                {p.mensajes > 0 && (
                  <span title={`${p.mensajes} mensajes`} className="inline-flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3" />{p.mensajes}
                  </span>
                )}
                {p.recuerdos > 0 && (
                  <span title={`${p.recuerdos} cosas que recuerda`} className="inline-flex items-center gap-0.5">
                    <Brain className="w-3 h-3" />{p.recuerdos}
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div className="relative flex items-center gap-0.5 shrink-0">
                <button onClick={() => alternarFavorito(p)} title={p.favorito ? 'Quitar de favoritas' : 'Marcar favorita'}
                  className="w-7 h-7 grid place-items-center rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                  <Star className={cn('w-3.5 h-3.5', p.favorito && 'fill-amber-400 text-amber-400')} />
                </button>
                <button onClick={() => setMenuFila(m => (m === p.id ? null : p.id))} title="Opciones"
                  className={cn('w-7 h-7 grid place-items-center rounded-lg transition-all',
                    menuFila === p.id ? 'bg-slate-200 text-slate-700' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200')}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {menuFila === p.id && (
                  <div className="absolute top-8 right-0 w-44 bg-white border border-slate-200 shadow-2xl rounded-xl py-1 z-20">
                    <button onClick={() => { setMenuFila(null); navegar(`/persona/${p.id}`); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Abrir y hablar
                    </button>
                    <button onClick={() => { setMenuFila(null); setFicha({ ...p }); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar ficha
                    </button>
                    <button onClick={() => quitar(p)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-left">
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" /> Quitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LA FICHA */}
      {ficha && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setFicha(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-black text-slate-900">
                {ficha.id ? 'Ficha de la persona' : 'Nueva persona'}
              </h2>
              <button onClick={() => setFicha(null)} className="ml-auto p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); guardarFicha(); }} className="space-y-2.5">
              <input autoFocus value={ficha.nombre || ''}
                onChange={e => setFicha(x => ({ ...x!, nombre: e.target.value }))}
                placeholder="Nombre"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-300" />

              <div className="grid grid-cols-2 gap-2">
                <input value={ficha.rol || ''} onChange={e => setFicha(x => ({ ...x!, rol: e.target.value }))}
                  placeholder="Cargo o papel"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300" />
                <input value={ficha.empresa || ''} onChange={e => setFicha(x => ({ ...x!, empresa: e.target.value }))}
                  placeholder="Empresa"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300" />
                <input value={ficha.email || ''} onChange={e => setFicha(x => ({ ...x!, email: e.target.value }))}
                  placeholder="Correo" type="email"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300" />
                <input value={ficha.telefono || ''} onChange={e => setFicha(x => ({ ...x!, telefono: e.target.value }))}
                  placeholder="Teléfono"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300" />
                <input value={ficha.web || ''} onChange={e => setFicha(x => ({ ...x!, web: e.target.value }))}
                  placeholder="Web"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300" />
                <input value={ficha.ubicacion || ''} onChange={e => setFicha(x => ({ ...x!, ubicacion: e.target.value }))}
                  placeholder="Dónde está"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">En qué punto estáis</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <button key={k} type="button"
                      onClick={() => setFicha(x => ({ ...x!, estado: x!.estado === k ? null : k }))}
                      className={cn('px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider transition-colors',
                        ficha.estado === k ? v.clase : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300')}>
                      {v.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              {grupos.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Grupos
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {grupos.map(g => {
                      const dentro = (ficha.grupo_ids || []).includes(g.id);
                      return (
                        <button key={g.id} type="button"
                          onClick={() => setFicha(x => ({
                            ...x!,
                            grupo_ids: dentro
                              ? (x!.grupo_ids || []).filter(i => i !== g.id)
                              : [...(x!.grupo_ids || []), g.id],
                          }))}
                          className={cn('px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors',
                            dentro ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                          {g.icono && <span className="mr-1">{g.icono}</span>}{g.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ETIQUETAS: texto libre separado por comas. Sin catálogo que
                  mantener — en un CRM personal las etiquetas se inventan sobre
                  la marcha, y obligar a crearlas antes es fricción para nada. */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Etiquetas
                </p>
                <input
                  value={(ficha.etiquetas || []).join(', ')}
                  onChange={e => setFicha(x => ({
                    ...x!,
                    etiquetas: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                  }))}
                  placeholder="permacultura, inversor, Madrid…"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                />
              </div>

              <textarea value={ficha.descripcion || ''}
                onChange={e => setFicha(x => ({ ...x!, descripcion: e.target.value }))}
                rows={3} placeholder="Quién es y qué tenéis entre manos"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none focus:outline-none focus:border-emerald-300" />

              <button type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors">
                <Check className="w-4 h-4" /> Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
