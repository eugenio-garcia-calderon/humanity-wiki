import { useEffect, useRef, useState } from 'react';
import { UserRound, LogOut, Bookmark, BookmarkCheck, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import MuroMiembros, { useCanjeEnlace, type Muro } from './MuroMiembros';
import { useSitio } from './ContextoSitio';

// ============================================================================
// «ENTRAR» EN UN SITIO CON MIEMBROS (2026-10-05, carril «acceso»)
// ============================================================================
// Una píldora flotante, abajo a la izquierda (arriba está el menú del sitio,
// que es del autor, y a la derecha la cesta): «Entrar» para quien no tiene
// sesión, y su nombre para quien sí, con «Guardar esta página» si su
// categoría puede guardar, sus guardados y «Salir».
//
// Sólo aparece en las páginas de un sitio que tiene los miembros activos: el
// servidor lo dice en `pagina.miembros`.

type Estado = {
  activo: boolean; raiz: string; nombre: string; logo: string | null; icono: string | null; acento: string | null;
  registro: string; enlace_magico: boolean; mensaje: string | null; es_equipo: boolean;
  yo: { nombre: string | null; email: string; estado: string; categoria: string | null; permisos: Record<string, boolean> | null } | null;
};

export default function BarraMiembro({ raiz, paginaId, onCambio }: { raiz: string; paginaId: string; onCambio: () => void }) {
  const [e, setE] = useState<Estado | null>(null);
  const [abierto, setAbierto] = useState<'menu' | 'entrar' | null>(null);
  const [guardados, setGuardados] = useState<any[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const sitio = useSitio();
  const base = `/api/sitio-miembros/${encodeURIComponent(raiz)}`;

  const cargar = () => fetch(`${base}/estado`, { credentials: 'include' }).then(r => r.json()).then(setE).catch(() => {});
  useEffect(() => { cargar(); }, [raiz]);
  const tras = () => { setAbierto(null); cargar(); onCambio(); };
  const avisoEnlace = useCanjeEnlace(raiz, tras);

  useEffect(() => {
    if (abierto !== 'menu') return;
    fetch(`${base}/guardados`, { credentials: 'include' }).then(r => (r.ok ? r.json() : { guardados: [] })).then(j => setGuardados(j.guardados || [])).catch(() => {});
    const fuera = (ev: PointerEvent) => { if (!caja.current?.contains(ev.target as Node)) setAbierto(null); };
    window.addEventListener('pointerdown', fuera);
    return () => window.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  if (!e?.activo || e.es_equipo) return null;
  const yo = e.yo;
  const acento = e.acento || '#0f172a';
  const guardada = !!guardados?.some(g => g.id === paginaId);
  const puedeGuardar = !!yo?.permisos?.guardar;

  const salir = async () => {
    await fetch(`${base}/salir`, { method: 'POST', credentials: 'include' });
    tras();
  };
  const alternarGuardado = async () => {
    setOcupado(true);
    await fetch(`${base}/guardados/${encodeURIComponent(paginaId)}`, { method: guardada ? 'DELETE' : 'PUT', credentials: 'include' });
    const j = await fetch(`${base}/guardados`, { credentials: 'include' }).then(r => r.json()).catch(() => ({ guardados: [] }));
    setGuardados(j.guardados || []);
    setOcupado(false);
  };
  const muro: Muro = {
    motivo: 'entrar',
    sitio: { raiz: e.raiz, nombre: e.nombre, logo: e.logo, icono: e.icono, acento: e.acento, registro: e.registro, enlace_magico: e.enlace_magico, mensaje: e.mensaje },
    yo: null,
  };

  return (
    <div ref={caja} className="fixed bottom-4 left-4 z-[60] print:hidden">
      {avisoEnlace && <p className="mb-2 max-w-xs rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 shadow">{avisoEnlace}</p>}
      {abierto === 'menu' && yo && (
        <div className="mb-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="truncate px-2 pt-1 text-[13px] font-bold text-slate-800">{yo.nombre || yo.email}</p>
          <p className="truncate px-2 pb-2 text-[11px] text-slate-400">{yo.categoria || 'Miembro'}{yo.estado !== 'activo' ? ' · pendiente' : ''}</p>
          {puedeGuardar && (
            <button onClick={alternarGuardado} disabled={ocupado}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
              {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : guardada ? <BookmarkCheck className="h-4 w-4" style={{ color: acento }} /> : <Bookmark className="h-4 w-4" />}
              {guardada ? 'Guardada' : 'Guardar esta página'}
            </button>
          )}
          {!!guardados?.length && (
            <div className="mt-1 border-t border-slate-100 pt-1">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Mis guardados</p>
              {guardados.slice(0, 8).map(g => (
                <Link key={g.id} to={sitio ? sitio.enlacePagina(g.id) : `/p/${g.id}`} onClick={() => setAbierto(null)}
                  className="block truncate rounded-lg px-2 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50">{g.titulo || 'Sin título'}</Link>
              ))}
            </div>
          )}
          <button onClick={salir} className="mt-1 flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-[13px] font-semibold text-slate-500 hover:bg-slate-50">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </div>
      )}
      {abierto === 'entrar' && !yo && (
        <div className="fixed inset-0 z-[61] grid place-items-center bg-slate-900/40 p-4" onClick={() => setAbierto(null)}>
          <div className="relative" onClick={ev => ev.stopPropagation()}>
            <button onClick={() => setAbierto(null)} aria-label="Cerrar"
              className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            <MuroMiembros muro={muro} onDentro={tras} enLinea />
          </div>
        </div>
      )}
      <button onClick={() => setAbierto(a => (a ? null : yo ? 'menu' : 'entrar'))}
        className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 text-[13px] font-bold text-slate-700 shadow-lg backdrop-blur hover:bg-white">
        <UserRound className="h-4 w-4" style={{ color: acento }} />
        {yo ? (yo.nombre || yo.email).split(' ')[0] : 'Entrar'}
      </button>
    </div>
  );
}
