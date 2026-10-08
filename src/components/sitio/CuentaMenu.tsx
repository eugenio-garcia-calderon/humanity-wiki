import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserRound, LogOut, X, Loader2, Package, FolderKanban, Settings, Bookmark, Pencil, ChevronLeft } from 'lucide-react';
import MuroMiembros, { type Muro } from './MuroMiembros';
import { useSitio } from './ContextoSitio';
import { cn } from '../../utils/cn';

// ============================================================================
// EL ICONO DE CUENTA DEL MENÚ (2026-10-08)
// ============================================================================
// Eugenio, desde luzhumanidad.com: «he activado que la gente se pueda registrar
// pero no hay ninguna herramienta para pinchar y registrarse. Que en el menú,
// arriba a la derecha, salga un icono de una personita: si se pincha, iniciar
// sesión o registrarse; y ya dentro, que se quede con la foto de perfil y ahí
// la configuración, cerrar sesión, mis proyectos y mis pedidos».
//
// Aparece SOLO, sin ningún interruptor: en cuanto la web tiene miembros
// activados (`pagina.miembros.raiz`), el menú lo pinta. Si el menú está
// apagado, sigue la píldora flotante de siempre (`BarraMiembro`).
//
// Lo que NO hace, a propósito: la sesión de un miembro es la de ESTA web y no
// abre la plataforma (ver `miembros.ts`). Por eso «Mis pedidos» se lee aquí
// mismo —sólo los de esta tienda— y «Mis proyectos» y «Ajustes» son enlaces a
// humanity.wiki, donde se entra con la misma cuenta (es la misma persona y la
// misma contraseña). El equipo de la web (quien la gestiona) ve sus accesos
// directos, no un menú de miembro.

const PLATAFORMA = 'https://humanity.wiki';

type Estado = {
  activo: boolean; raiz: string; nombre: string; logo: string | null; icono: string | null; acento: string | null;
  registro: string; enlace_magico: boolean; mensaje: string | null; es_equipo: boolean;
  yo: { nombre: string | null; email: string; estado: string; categoria: string | null; avatar: string | null; permisos: Record<string, boolean> | null } | null;
  equipo: { nombre: string | null; avatar: string | null } | null;
};
type Pedido = { codigo: string; resumen: string; total_centimos: number; moneda: string; estado: string; seguimiento: string | null; entrega_estimada: string | null; fecha: string };

const ESTADOS: Record<string, string> = {
  pagado: 'Pagado', preparando: 'Preparando', enviado: 'Enviado', entregado: 'Entregado', devuelto: 'Devuelto', cancelado: 'Cancelado',
};

function Foto({ url, nombre, tam, acento }: { url?: string | null; nombre?: string | null; tam: number; acento?: string | null }) {
  const [rota, setRota] = useState(false);
  if (url && !rota) {
    return <img src={url} alt="" onError={() => setRota(true)} style={{ width: tam, height: tam }} className="rounded-full object-cover shrink-0" />;
  }
  const inicial = (nombre || '').trim().charAt(0).toUpperCase();
  return inicial
    ? <span style={{ width: tam, height: tam, background: acento || '#0f172a', fontSize: Math.round(tam * 0.45) }} className="rounded-full grid place-items-center font-black text-white shrink-0">{inicial}</span>
    : <UserRound style={{ width: tam * 0.62, height: tam * 0.62 }} strokeWidth={1.9} className="shrink-0" />;
}

export default function CuentaMenu({ raiz, color, className }: { raiz: string; color?: string; className?: string }) {
  const base = `/api/sitio-miembros/${encodeURIComponent(raiz)}`;
  const sitio = useSitio();
  const [e, setE] = useState<Estado | null>(null);
  const [abierto, setAbierto] = useState<'menu' | 'entrar' | null>(null);
  const [vista, setVista] = useState<'principal' | 'pedidos' | 'guardados'>('principal');
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [guardados, setGuardados] = useState<any[] | null>(null);
  const [pos, setPos] = useState<{ top: number; right?: number; left?: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cargar = () => fetch(`${base}/estado`, { credentials: 'include' }).then(r => r.json()).then(setE).catch(() => {});
  useEffect(() => { cargar(); }, [raiz]);

  // Al abrir: dónde cae el panel (justo debajo del icono, pegado a su lado derecho si cabe) y a quién se cierra.
  useEffect(() => {
    if (abierto !== 'menu') return;
    const r = boton.current?.getBoundingClientRect();
    if (r) setPos(r.right < 300 ? { top: r.bottom + 8, left: Math.max(8, r.left) } : { top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    const fuera = (ev: PointerEvent) => {
      const t = ev.target as Node;
      if (!panel.current?.contains(t) && !boton.current?.contains(t)) setAbierto(null);
    };
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { setAbierto(null); boton.current?.focus(); } };
    window.addEventListener('pointerdown', fuera);
    window.addEventListener('keydown', tecla);
    window.addEventListener('resize', () => setAbierto(null));
    return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', tecla); };
  }, [abierto]);

  useEffect(() => { if (abierto !== 'menu') setVista('principal'); }, [abierto]);
  useEffect(() => {
    if (vista === 'pedidos' && pedidos === null) {
      fetch(`${base}/mis-pedidos`, { credentials: 'include' }).then(r => (r.ok ? r.json() : { pedidos: [] })).then(j => setPedidos(j.pedidos || [])).catch(() => setPedidos([]));
    }
    if (vista === 'guardados' && guardados === null) {
      fetch(`${base}/guardados`, { credentials: 'include' }).then(r => (r.ok ? r.json() : { guardados: [] })).then(j => setGuardados(j.guardados || [])).catch(() => setGuardados([]));
    }
  }, [vista]);

  // Una web sin miembros no lleva icono; mientras se pregunta, el icono neutro (así el HTML del servidor ya lo trae).
  if (e && !e.activo) return null;
  const yo = e?.yo || null;
  const equipo = e?.es_equipo ? e.equipo : null;
  const acento = e?.acento || '#0f172a';
  const nombre = yo?.nombre || yo?.email || equipo?.nombre || null;
  const foto = yo?.avatar || equipo?.avatar || null;
  const conSesion = !!(yo || e?.es_equipo);

  const recargar = () => window.location.reload();
  const salir = async () => { await fetch(`${base}/salir`, { method: 'POST', credentials: 'include' }); recargar(); };
  const dinero = (c: number, m: string) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: m || 'EUR' }).format(c / 100);
  const fecha = (f: string) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const muro: Muro | null = e ? {
    motivo: 'entrar',
    sitio: { raiz: e.raiz, nombre: e.nombre, logo: e.logo, icono: e.icono, acento: e.acento, registro: e.registro, enlace_magico: e.enlace_magico, mensaje: e.mensaje },
    yo: null,
  } : null;

  const Item = ({ icono: I, texto, onClick, href }: { icono: any; texto: string; onClick?: () => void; href?: string }) => {
    const clase = 'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50';
    return href
      ? <a href={href} target="_blank" rel="noopener noreferrer" className={clase}><I className="h-4 w-4 text-slate-400" />{texto}</a>
      : <button type="button" onClick={onClick} className={clase}><I className="h-4 w-4 text-slate-400" />{texto}</button>;
  };

  return (
    <>
      <button ref={boton} type="button"
        onClick={() => setAbierto(a => (a ? null : conSesion ? 'menu' : 'entrar'))}
        aria-label={conSesion ? `Mi cuenta${nombre ? `: ${nombre}` : ''}` : 'Entrar o registrarte'} aria-haspopup="menu" aria-expanded={abierto === 'menu'}
        title={conSesion ? 'Mi cuenta' : 'Entrar o registrarte'}
        style={color ? { color } : undefined}
        className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5 focus-visible:outline focus-visible:outline-2', className)}>
        {conSesion ? <Foto url={foto} nombre={nombre} tam={32} acento={acento} /> : <UserRound className="h-[22px] w-[22px]" strokeWidth={1.9} />}
      </button>

      {abierto === 'menu' && conSesion && pos && createPortal(
        <div ref={panel} role="menu" style={{ top: pos.top, right: pos.right, left: pos.left }}
          className="fixed z-[10000] w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-2xl">
          {vista === 'principal' && (
            <>
              <div className="flex items-center gap-3 px-2 py-2">
                <Foto url={foto} nombre={nombre} tam={40} acento={acento} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-slate-900">{nombre}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {equipo ? 'Equipo de esta web' : `${yo?.categoria || 'Miembro'}${yo && yo.estado !== 'activo' ? ' · pendiente de aprobación' : ''}`}
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-1">
                {equipo ? (
                  <>
                    <Item icono={Pencil} texto="Editar esta página" href={`${PLATAFORMA}/paginas/${encodeURIComponent(raiz)}`} />
                    <Item icono={Package} texto="Mis pedidos" href={`${PLATAFORMA}/comercio?pestana=pedidos`} />
                  </>
                ) : (
                  <>
                    {yo?.estado === 'activo' && <Item icono={Package} texto="Mis pedidos" onClick={() => setVista('pedidos')} />}
                    {yo?.permisos?.guardar && <Item icono={Bookmark} texto="Mis guardados" onClick={() => setVista('guardados')} />}
                  </>
                )}
                <Item icono={FolderKanban} texto="Mis proyectos" href={`${PLATAFORMA}/proyectos`} />
                <Item icono={Settings} texto="Ajustes" href={`${PLATAFORMA}/configuracion`} />
              </div>
              {!equipo && (
                <div className="border-t border-slate-100 pt-1">
                  <Item icono={LogOut} texto="Cerrar sesión" onClick={salir} />
                </div>
              )}
              {!equipo && <p className="px-3 pb-1 pt-1 text-[10px] leading-snug text-slate-400">«Mis proyectos» y «Ajustes» se abren en humanity.wiki: entra allí con este mismo correo y contraseña.</p>}
            </>
          )}

          {vista !== 'principal' && (
            <>
              <button type="button" onClick={() => setVista('principal')} className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-[12px] font-bold text-slate-500 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" /> {vista === 'pedidos' ? 'Mis pedidos' : 'Mis guardados'}
              </button>
              <div className="max-h-80 overflow-y-auto">
                {(vista === 'pedidos' ? pedidos : guardados) === null && <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>}
                {vista === 'pedidos' && pedidos?.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-slate-400">Todavía no has hecho ningún pedido en esta web.</p>}
                {vista === 'pedidos' && pedidos?.map(p => (
                  <div key={p.codigo} className="rounded-xl px-3 py-2 hover:bg-slate-50">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13px] font-bold text-slate-800">{p.resumen}</p>
                      <p className="shrink-0 text-[12px] font-black tabular-nums">{dinero(p.total_centimos, p.moneda)}</p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700">{ESTADOS[p.estado] || p.estado}</span> · {fecha(p.fecha)} · <span className="font-mono">{p.codigo}</span>
                    </p>
                    {p.seguimiento && <p className="text-[11px] text-slate-500">Seguimiento: {p.seguimiento}</p>}
                  </div>
                ))}
                {vista === 'guardados' && guardados?.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-slate-400">Aún no has guardado nada.</p>}
                {vista === 'guardados' && guardados?.map(g => (
                  <a key={g.id} href={sitio ? sitio.enlacePagina(g.id) : `/p/${g.id}`} className="block truncate rounded-lg px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50">{g.titulo || 'Sin título'}</a>
                ))}
              </div>
            </>
          )}
        </div>,
        document.body,
      )}

      {abierto === 'entrar' && !conSesion && muro && createPortal(
        <div className="fixed inset-0 z-[10000] grid place-items-center overflow-y-auto bg-slate-900/40 p-4" onClick={() => setAbierto(null)}>
          <div className="relative" onClick={ev => ev.stopPropagation()}>
            <button onClick={() => setAbierto(null)} aria-label="Cerrar"
              className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            <MuroMiembros muro={muro} onDentro={recargar} enLinea />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
