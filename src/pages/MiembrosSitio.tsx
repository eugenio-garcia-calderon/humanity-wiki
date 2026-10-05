import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, Loader2, Search, Download, UserPlus, Check, X, ShieldOff, ShieldCheck, Trash2,
  Plus, ChevronRight, Lock, Globe, Settings, Tags, Eye, Mail,
} from 'lucide-react';
import { cn } from '../utils/cn';

// ============================================================================
// EL PANEL DE MIEMBROS DE UN SITIO (2026-10-05, carril «acceso»)
// ============================================================================
// `/paginas/:id/miembros`. Donde el editor de una página publicada decide
// quién se registra en su web y qué ve cada uno, al estilo Softr:
//   · Miembros: la lista, buscar, cambiar de categoría, aprobar, bloquear,
//     invitar en bloque y exportar a CSV, con la última visita de cada uno.
//   · Categorías: los roles con nombre propio y qué puede cada uno.
//   · Acceso: qué páginas, secciones o bloques ve cada categoría.
//   · Ajustes: cómo se entra (abierto, con aprobación, sólo invitación), el
//     enlace mágico y el mensaje de la puerta.
// El diseño del servidor está en la cabecera de `src/server/miembros.ts`.

type Panel = {
  pagina: { id: string; titulo: string; slug: string | null; publico: boolean; handle: string | null; dominios: string[]; raiz_restringida: boolean };
  config: { activo: boolean; registro: string; enlace_magico: boolean; categoria_defecto: string | null; mensaje: string | null } | null;
  categorias: { id: string; nombre: string; color: string | null; permisos: Record<string, boolean>; miembros: number }[];
  cifras: { activos: number; pendientes: number; invitados: number; bloqueados: number };
  correo_activo: boolean;
};

const PERMISOS: { id: string; nombre: string; explica: string }[] = [
  { id: 'ver', nombre: 'Ver', explica: 'Ve las páginas restringidas a su categoría.' },
  { id: 'comentar', nombre: 'Comentar', explica: 'Comenta y responde.' },
  { id: 'guardar', nombre: 'Guardar', explica: 'Guarda páginas en «Mis guardados» y productos en favoritos.' },
  { id: 'comprar', nombre: 'Comprar', explica: 'Compra en la tienda del sitio con su cuenta.' },
  { id: 'editar', nombre: 'Editar', explica: 'Edita las páginas que ve, desde humanity.wiki con la misma cuenta.' },
  { id: 'todo', nombre: 'Todo', explica: 'Todo lo anterior.' },
];
const ESTADOS: Record<string, { nombre: string; clase: string }> = {
  activo: { nombre: 'Activo', clase: 'bg-emerald-50 text-emerald-700' },
  pendiente: { nombre: 'Pendiente', clase: 'bg-amber-50 text-amber-700' },
  invitado: { nombre: 'Invitado', clase: 'bg-sky-50 text-sky-700' },
  bloqueado: { nombre: 'Bloqueado', clase: 'bg-rose-50 text-rose-700' },
};

const json = (r: Response) => r.json().catch(() => ({}));
const pedir = (url: string, metodo = 'GET', cuerpo?: any) => fetch(url, {
  method: metodo, credentials: 'include',
  headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});
const hace = (iso: string | null) => {
  if (!iso) return 'Nunca';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 120) return 'Ahora';
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'Ayer';
  if (s < 86400 * 60) return `Hace ${Math.floor(s / 86400)} días`;
  return new Date(iso).toLocaleDateString('es-ES');
};

export default function MiembrosSitio() {
  const { id = '' } = useParams();
  const [p, setP] = useState<Panel | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [pestana, setPestana] = useState<'miembros' | 'categorias' | 'acceso' | 'ajustes'>('miembros');
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const base = `/api/sitio-miembros/${encodeURIComponent(id)}`;

  const cargar = () => pedir(`${base}/panel`).then(async r => {
    const j = await json(r);
    if (!r.ok) { setFallo(j.error || 'No se ha podido cargar.'); return; }
    setP(j);
  }).catch(() => setFallo('No se ha podido cargar.'));
  useEffect(() => { cargar(); }, [id]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t); }, [aviso]);

  const decir = async (r: Response, ok?: string) => {
    const j = await json(r);
    if (!r.ok) setAviso({ texto: j.error || 'No se ha podido.', error: true });
    else if (ok) setAviso({ texto: ok });
    return { ok: r.ok, j };
  };
  const ajustar = async (cambio: any, ok?: string) => { await decir(await pedir(`${base}/config`, 'PUT', cambio), ok); cargar(); };

  if (fallo) return <div className="mx-auto max-w-3xl p-6"><p className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{fallo}</p></div>;
  if (!p) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>;

  const direcciones = [
    ...p.pagina.dominios.map(d => `https://${d}`),
    ...(p.pagina.handle && p.pagina.slug ? [`https://${p.pagina.handle}.humanity.wiki/${p.pagina.slug}`] : []),
  ];
  const activo = !!p.config?.activo;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link to={`/paginas/${id}`} className="inline-flex h-9 items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a la página
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-slate-900">Miembros</h1>
          <p className="truncate text-sm text-slate-500">de «{p.pagina.titulo || 'Sin título'}»</p>
        </div>
        {p.config && (
          <button onClick={() => ajustar({ activo: !activo }, activo ? 'Registro desactivado: nadie nuevo puede entrar y las páginas restringidas quedan para el equipo.' : 'Registro activado.')}
            className={cn('flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors',
              activo ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
            <span className={cn('h-2 w-2 rounded-full', activo ? 'bg-white' : 'bg-slate-300')} />
            {activo ? 'Registro activado' : 'Registro desactivado'}
          </button>
        )}
      </div>

      {aviso && (
        <p role="status" className={cn('mt-3 rounded-xl px-3 py-2 text-xs font-bold', aviso.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800')}>{aviso.texto}</p>
      )}

      {!p.config ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Users className="h-6 w-6" /></span>
          <h2 className="mt-3 text-lg font-black text-slate-900">Permitir registro en tu sitio</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
            Los visitantes podrán crear su cuenta o entrar dentro de tu web —con tu marca, también en tu dominio propio— y tú decides qué ve cada categoría:
            páginas enteras, secciones o bloques sueltos. Podrás aprobar registros a mano, invitar en bloque y ver quién entra.
          </p>
          <button onClick={() => ajustar({ activo: true }, 'Registro activado. Ahora elige qué es solo para miembros en «Acceso».')}
            className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
            <UserPlus className="h-4 w-4" /> Activar miembros
          </button>
          {!direcciones.length && <p className="mt-3 text-xs text-amber-700">Tu página aún no tiene dirección: publícala desde «Compartir» para que la gente pueda llegar.</p>}
        </div>
      ) : (
        <>
          {direcciones.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {direcciones.map(d => <a key={d} href={d} target="_blank" rel="noreferrer" className="font-mono hover:underline">{d.replace(/^https:\/\//, '')}</a>)}
            </p>
          )}
          <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
            {([['miembros', 'Miembros', Users], ['categorias', 'Categorías', Tags], ['acceso', 'Acceso', Eye], ['ajustes', 'Ajustes', Settings]] as const).map(([k, t, Ic]) => (
              <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
                className={cn('-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-bold transition-colors',
                  pestana === k ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700')}>
                <Ic className="h-4 w-4" /> {t}
                {k === 'miembros' && p.cifras.pendientes > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">{p.cifras.pendientes}</span>}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {pestana === 'miembros' && <PestanaMiembros base={base} panel={p} decir={decir} recargarPanel={cargar} />}
            {pestana === 'categorias' && <PestanaCategorias base={base} panel={p} decir={decir} recargar={cargar} ajustar={ajustar} />}
            {pestana === 'acceso' && <PestanaAcceso base={base} panel={p} decir={decir} />}
            {pestana === 'ajustes' && <PestanaAjustes panel={p} ajustar={ajustar} />}
          </div>
        </>
      )}
    </div>
  );
}

type Decir = (r: Response, ok?: string) => Promise<{ ok: boolean; j: any }>;

// ── MIEMBROS ────────────────────────────────────────────────────────────────

function PestanaMiembros({ base, panel, decir, recargarPanel }: { base: string; panel: Panel; decir: Decir; recargarPanel: () => void }) {
  const [lista, setLista] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [cat, setCat] = useState('');
  const [invitando, setInvitando] = useState(false);
  const [correos, setCorreos] = useState('');
  const [catInv, setCatInv] = useState(panel.config?.categoria_defecto || '');
  const reloj = useRef<any>(null);

  const cargar = (qq = q) => pedir(`${base}/miembros?q=${encodeURIComponent(qq)}&estado=${estado}&categoria=${cat}`).then(json).then(j => setLista(j.miembros || []));
  useEffect(() => { cargar(); }, [estado, cat]);
  const buscar = (v: string) => { setQ(v); clearTimeout(reloj.current); reloj.current = setTimeout(() => cargar(v), 250); };
  const cambiar = async (m: any, cambio: any, ok: string) => { await decir(await pedir(`${base}/miembros/${m.id}`, 'PUT', cambio), ok); cargar(); recargarPanel(); };
  const quitar = async (m: any) => {
    if (!confirm(`¿Quitar a ${m.email} de los miembros? Su cuenta no se borra; solo deja de ser miembro de este sitio.`)) return;
    await decir(await pedir(`${base}/miembros/${m.id}`, 'DELETE'), 'Quitado.'); cargar(); recargarPanel();
  };
  const invitar = async () => {
    const { ok, j } = await decir(await pedir(`${base}/invitar`, 'POST', { emails: correos, categoria_id: catInv || undefined, avisar: true }));
    if (!ok) return;
    const partes = [`${j.nuevos} invitados`, j.actualizados ? `${j.actualizados} ya estaban (cambiados de categoría)` : '', j.descartados ? `${j.descartados} correos no válidos descartados` : ''].filter(Boolean).join(', ');
    await decir(new Response(JSON.stringify({}), { status: 200 }), `${partes}. ${j.correos ? `${j.correos} correos enviados.` : 'No se ha enviado ningún correo: avísales tú. Entrarán al registrarse con ese correo.'}`);
    setCorreos(''); setInvitando(false); cargar(); recargarPanel();
  };

  const filtros: [string, string, number][] = [
    ['', 'Todos', panel.cifras.activos + panel.cifras.pendientes + panel.cifras.invitados + panel.cifras.bloqueados],
    ['activo', 'Activos', panel.cifras.activos], ['pendiente', 'Pendientes', panel.cifras.pendientes],
    ['invitado', 'Invitados', panel.cifras.invitados], ['bloqueado', 'Bloqueados', panel.cifras.bloqueados],
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {filtros.map(([k, t, n]) => (
          <button key={k} onClick={() => setEstado(k)}
            className={cn('h-9 rounded-full px-3 text-xs font-bold transition-colors', estado === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {t} · {n}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => buscar(e.target.value)} placeholder="Buscar por nombre o correo"
            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-base outline-none focus:border-slate-400 sm:text-sm" />
        </div>
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Filtrar por categoría"
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <option value="">Todas las categorías</option>
          {panel.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button onClick={() => setInvitando(v => !v)} className="flex h-11 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-800">
          <UserPlus className="h-4 w-4" /> Invitar
        </button>
        <a href={`${base}/miembros.csv`} className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <Download className="h-4 w-4" /> CSV
        </a>
      </div>

      {invitando && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-700">Invitar en bloque</p>
          <p className="text-[11px] text-slate-500">Pega los correos (uno por línea, o separados por comas). Hasta 500 de una vez. Entrarán al registrarse o pedir el enlace con ese correo, aunque el registro esté cerrado.</p>
          <textarea value={correos} onChange={e => setCorreos(e.target.value)} rows={4} placeholder={'ana@ejemplo.com\nluis@ejemplo.com'}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={catInv} onChange={e => setCatInv(e.target.value)} aria-label="Categoría de los invitados"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              {panel.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button onClick={invitar} disabled={!correos.trim()} className="flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40">
              <Mail className="h-4 w-4" /> Invitar
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {lista === null ? <p className="p-4 text-sm text-slate-400">Cargando…</p>
          : !lista.length ? <p className="p-6 text-center text-sm text-slate-400">{q || estado || cat ? 'Nadie con ese filtro.' : 'Todavía no hay miembros. Comparte la dirección de tu sitio o invita a alguien.'}</p>
          : lista.map(m => (
            <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-3 py-2.5 last:border-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500">{(m.nombre || m.email).charAt(0).toUpperCase()}</span>
              <div className="min-w-[160px] flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{m.nombre || m.email}</p>
                <p className="truncate text-xs text-slate-400">{m.nombre ? m.email : ''}{m.nombre ? ' · ' : ''}Última visita: {hace(m.ultima_visita)}</p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', ESTADOS[m.estado]?.clase)}>{ESTADOS[m.estado]?.nombre || m.estado}</span>
              <select value={m.categoria_id || ''} onChange={e => cambiar(m, { categoria_id: e.target.value }, 'Categoría cambiada.')} aria-label={`Categoría de ${m.email}`}
                className="h-9 max-w-[150px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700">
                {panel.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <div className="flex items-center gap-1">
                {m.estado === 'pendiente' && (
                  <button onClick={() => cambiar(m, { estado: 'activo' }, 'Aprobado.')} title="Aprobar"
                    className="flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" /> Aprobar</button>
                )}
                {m.estado === 'bloqueado'
                  ? <button onClick={() => cambiar(m, { estado: 'activo' }, 'Desbloqueado.')} title="Desbloquear" aria-label={`Desbloquear a ${m.email}`}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><ShieldCheck className="h-4 w-4" /></button>
                  : <button onClick={() => cambiar(m, { estado: 'bloqueado' }, 'Bloqueado: sus sesiones en el sitio se han cerrado.')} title="Bloquear" aria-label={`Bloquear a ${m.email}`}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><ShieldOff className="h-4 w-4" /></button>}
                <button onClick={() => quitar(m)} title="Quitar" aria-label={`Quitar a ${m.email}`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── CATEGORÍAS ──────────────────────────────────────────────────────────────

function PestanaCategorias({ base, panel, decir, recargar, ajustar }: { base: string; panel: Panel; decir: Decir; recargar: () => void; ajustar: (c: any, ok?: string) => Promise<void> }) {
  const [nueva, setNueva] = useState('');
  const crear = async () => {
    if (!nueva.trim()) return;
    await decir(await pedir(`${base}/categorias`, 'POST', { nombre: nueva, permisos: { ver: true } }), 'Categoría creada.');
    setNueva(''); recargar();
  };
  const cambiar = async (c: any, cambio: any) => { await decir(await pedir(`${base}/categorias/${c.id}`, 'PUT', cambio)); recargar(); };
  const borrar = async (c: any) => {
    if (!confirm(`¿Borrar «${c.nombre}»? Sus ${c.miembros} miembros pasan a la categoría por defecto.`)) return;
    await decir(await pedir(`${base}/categorias/${c.id}`, 'DELETE'), 'Borrada.'); recargar();
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Cada categoría es un tipo de miembro con lo que puede hacer. Quien se registra entra en la categoría <b>por defecto</b>.</p>
      {panel.categorias.map(c => {
        const defecto = panel.config?.categoria_defecto === c.id;
        return (
          <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input defaultValue={c.nombre} onBlur={e => e.target.value.trim() && e.target.value !== c.nombre && cambiar(c, { nombre: e.target.value })}
                aria-label="Nombre de la categoría"
                className="h-10 min-w-0 flex-1 rounded-xl border border-transparent px-2 text-sm font-black text-slate-800 outline-none hover:border-slate-200 focus:border-slate-400" />
              <span className="text-xs text-slate-400">{c.miembros} {c.miembros === 1 ? 'miembro' : 'miembros'}</span>
              {defecto
                ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">Por defecto</span>
                : <button onClick={() => ajustar({ categoria_defecto: c.id }, `«${c.nombre}» es ahora la categoría por defecto.`)} className="h-9 rounded-lg px-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Hacer por defecto</button>}
              {!defecto && (
                <button onClick={() => borrar(c)} aria-label={`Borrar ${c.nombre}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {PERMISOS.map(x => {
                const on = !!c.permisos?.[x.id];
                return (
                  <label key={x.id} className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50">
                    <input type="checkbox" checked={on} onChange={() => cambiar(c, { permisos: { ...c.permisos, [x.id]: !on } })} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                    <span><span className="block text-[13px] font-bold text-slate-700">{x.nombre}</span><span className="block text-[11px] text-slate-400">{x.explica}</span></span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex gap-2">
        <input value={nueva} onChange={e => setNueva(e.target.value)} onKeyDown={e => e.key === 'Enter' && crear()} placeholder="Nueva categoría (p. ej. «Socios»)"
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-slate-400 sm:text-sm" />
        <button onClick={crear} disabled={!nueva.trim()} className="flex h-11 items-center gap-1 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Crear</button>
      </div>
    </div>
  );
}

// ── ACCESO ──────────────────────────────────────────────────────────────────

type Regla = { alcance: string; categorias: string[] } | null;

/** «Quién ve esto»: todos, cualquier miembro, o unas categorías. */
function SelectorAcceso({ regla, categorias, onCambio, seccion }: {
  regla: Regla; categorias: Panel['categorias']; onCambio: (acceso: string, cats?: string[], seccion?: boolean) => void; seccion?: boolean;
}) {
  const valor = !regla ? 'todos' : regla.categorias.length ? 'categorias' : 'miembros';
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState<string[]>(regla?.categorias || []);
  const [enSeccion, setEnSeccion] = useState(regla?.alcance === 'seccion');
  useEffect(() => { setSel(regla?.categorias || []); setEnSeccion(regla?.alcance === 'seccion'); }, [regla]);
  const nombre = valor === 'todos' ? 'Todos' : valor === 'miembros' ? 'Miembros' : sel.map(c => categorias.find(x => x.id === c)?.nombre).filter(Boolean).join(', ');
  return (
    <div className="relative shrink-0">
      <button onClick={() => setAbierto(a => !a)}
        className={cn('flex h-9 max-w-[220px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold',
          valor === 'todos' ? 'text-slate-500 hover:bg-slate-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100')}>
        {valor === 'todos' ? <Globe className="h-3.5 w-3.5 shrink-0" /> : <Lock className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{nombre}</span>
      </button>
      {abierto && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {[['todos', 'Todos', 'Cualquiera que llegue, sin entrar.'], ['miembros', 'Miembros', 'Cualquier miembro activo.']].map(([k, t, e]) => (
            <button key={k} onClick={() => { setAbierto(false); onCambio(k, [], enSeccion); }}
              className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
              <span className="mt-0.5 w-4">{valor === k && <Check className="h-3.5 w-3.5 text-emerald-600" />}</span>
              <span><span className="block text-[13px] font-bold text-slate-800">{t}</span><span className="block text-[11px] text-slate-400">{e}</span></span>
            </button>
          ))}
          <p className="mt-1 border-t border-slate-100 px-2 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Solo estas categorías</p>
          {categorias.map(c => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50">
              <input type="checkbox" checked={sel.includes(c.id)} onChange={() => setSel(s => (s.includes(c.id) ? s.filter(x => x !== c.id) : [...s, c.id]))} className="h-4 w-4 accent-emerald-600" />
              <span className="text-[13px] text-slate-700">{c.nombre}</span>
            </label>
          ))}
          {seccion && (
            <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-slate-100 px-2 pt-2 text-[12px] text-slate-600">
              <input type="checkbox" checked={enSeccion} onChange={() => setEnSeccion(v => !v)} className="h-4 w-4 accent-emerald-600" />
              Toda la sección (hasta el siguiente título)
            </label>
          )}
          <button onClick={() => { setAbierto(false); if (sel.length) onCambio('categorias', sel, enSeccion); }} disabled={!sel.length}
            className="mt-2 h-9 w-full rounded-xl bg-slate-900 text-xs font-bold text-white disabled:opacity-40">Aplicar</button>
        </div>
      )}
    </div>
  );
}

function PestanaAcceso({ base, panel, decir }: { base: string; panel: Panel; decir: Decir }) {
  const [paginas, setPaginas] = useState<any[] | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const cargar = () => pedir(`${base}/paginas`).then(json).then(j => setPaginas(j.paginas || []));
  useEffect(() => { cargar(); }, []);
  const poner = async (pagina_id: string, bloque_id: string, acceso: string, categorias?: string[], seccion?: boolean) => {
    await decir(await pedir(`${base}/restricciones`, 'PUT', { pagina_id, bloque_id, acceso, categorias, seccion }),
      acceso === 'todos' ? 'Abierto a todos.' : bloque_id ? 'Restringido.' : 'Página restringida: ya no es pública, solo la ven quienes elegiste.');
    cargar();
  };
  // En orden de árbol: cada página detrás de su madre.
  const ordenadas = useMemo(() => {
    if (!paginas) return [];
    const hijas = new Map<string | null, any[]>();
    for (const x of paginas) (hijas.get(x.madre) || hijas.set(x.madre, []).get(x.madre)!).push(x);
    const out: any[] = [];
    const visitar = (madre: string | null, vistos: Set<string>) => {
      for (const x of hijas.get(madre) || []) { if (vistos.has(x.id)) continue; vistos.add(x.id); out.push(x); visitar(x.id, vistos); }
    };
    visitar(null, new Set());
    return out;
  }, [paginas]);

  if (!paginas) return <p className="text-sm text-slate-400">Cargando las páginas del sitio…</p>;
  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        Por defecto todo es para <b>todos</b>. Restringe una página entera (y lo que cuelga de ella) o abre una página y restringe bloques o secciones sueltas.
        Una página restringida deja de ser pública: Google y quien no tenga acceso solo ven la puerta de entrada.
      </p>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {ordenadas.map(pg => {
          const abierta = abiertas.has(pg.id);
          return (
            <div key={pg.id} className="border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 px-2 py-1.5" style={{ paddingLeft: 8 + Math.min(pg.nivel, 6) * 18 }}>
                <button onClick={() => setAbiertas(s => { const n = new Set(s); n.has(pg.id) ? n.delete(pg.id) : n.add(pg.id); return n; })}
                  aria-label={abierta ? 'Ocultar bloques' : 'Ver bloques'} aria-expanded={abierta}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                  <ChevronRight className={cn('h-4 w-4 transition-transform', abierta && 'rotate-90')} />
                </button>
                <span className="w-5 shrink-0 text-center">{pg.icono && [...pg.icono].length <= 2 ? pg.icono : ''}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{pg.titulo}{pg.nivel === 0 && <span className="ml-1.5 text-[11px] font-normal text-slate-400">(inicio del sitio)</span>}</span>
                <SelectorAcceso regla={pg.regla} categorias={panel.categorias} onCambio={(a, c) => poner(pg.id, '', a, c)} />
              </div>
              {abierta && (
                <div className="bg-slate-50/60 pb-2">
                  {!pg.bloques.length && <p className="px-12 py-2 text-xs text-slate-400">Página vacía.</p>}
                  {pg.bloques.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2 py-1 pr-2" style={{ paddingLeft: 48 + Math.min(pg.nivel, 6) * 18 + (b.sangria || 0) * 14 }}>
                      <span className="w-20 shrink-0 truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{b.tipo}</span>
                      <span className={cn('min-w-0 flex-1 truncate text-xs', b.titulo ? 'font-bold text-slate-700' : 'text-slate-500')}>{b.adelanto || <i className="text-slate-300">sin texto</i>}</span>
                      <SelectorAcceso regla={b.regla} categorias={panel.categorias} seccion={b.titulo}
                        onCambio={(a, c, sec) => poner(pg.id, b.id, a, c, sec)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AJUSTES ─────────────────────────────────────────────────────────────────

function PestanaAjustes({ panel, ajustar }: { panel: Panel; ajustar: (c: any, ok?: string) => Promise<void> }) {
  const c = panel.config!;
  const [mensaje, setMensaje] = useState(c.mensaje || '');
  const modos: [string, string, string][] = [
    ['abierto', 'Abierto', 'Quien se registra entra al momento, en la categoría por defecto.'],
    ['aprobacion', 'Con aprobación', 'Quien se registra queda pendiente hasta que lo apruebes. Te llega un aviso.'],
    ['invitacion', 'Solo por invitación', 'Solo entran los correos que hayas invitado.'],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black text-slate-800">Cómo se entra</p>
        <div className="mt-2 space-y-1">
          {modos.map(([k, t, e]) => (
            <label key={k} className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-2 hover:bg-slate-50">
              <input type="radio" name="registro" checked={c.registro === k} onChange={() => ajustar({ registro: k }, 'Guardado.')} className="mt-0.5 h-4 w-4 accent-emerald-600" />
              <span><span className="block text-[13px] font-bold text-slate-700">{t}</span><span className="block text-[11px] text-slate-400">{e}</span></span>
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="flex cursor-pointer items-start gap-2">
          <input type="checkbox" checked={c.enlace_magico} onChange={() => ajustar({ enlace_magico: !c.enlace_magico }, 'Guardado.')} className="mt-0.5 h-4 w-4 accent-emerald-600" />
          <span>
            <span className="block text-[13px] font-bold text-slate-700">Entrar con un enlace al correo</span>
            <span className="block text-[11px] text-slate-400">Además de la contraseña, el visitante puede pedir un enlace de un solo uso que caduca en 20 minutos.</span>
            {!panel.correo_activo && <span className="mt-1 block text-[11px] font-bold text-amber-700">La plataforma aún no tiene proveedor de correo: hasta que lo tenga, esta opción no se ofrece a los visitantes.</span>}
          </span>
        </label>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black text-slate-800">Mensaje de la puerta</p>
        <p className="text-[11px] text-slate-400">Lo que lee quien llega a una página para miembros, encima del formulario.</p>
        <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={3} maxLength={500} placeholder="Este contenido es para socios. Entra o crea tu cuenta."
          className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400" />
        <button onClick={() => ajustar({ mensaje }, 'Guardado.')} className="mt-2 h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white">Guardar</button>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><X className="h-3 w-3" /> Desactivar el registro (arriba) no borra a nadie: las páginas restringidas quedan solo para ti y tu equipo hasta que lo reactives.</p>
    </div>
  );
}
