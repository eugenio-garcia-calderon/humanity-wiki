import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Copy, Database, Link2, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import MenuAcciones from './MenuAcciones';
import { duplicarFila, eliminarFila } from './accionesFila';

// ============================================================================
// LOS TRES PUNTITOS DE LA PÁGINA DE UNA ENTRADA (2026-10-08)
// ============================================================================
// Eugenio: «cuando pinchas y entras en la página de la entrada de la base de
// datos, que arriba a la derecha haya tres puntitos para poder eliminar,
// entre otras cosas, esa página».
//
// Aquí sí se pregunta antes de eliminar: la persona sale de la página y no
// habría dónde ofrecerle «Deshacer». La entrada no se borra de verdad: queda
// 15 días recuperable, y el cuadro lo dice.

export default function MenuEntradaPagina({ filaId, tablaId, paginaId, nombre, tablaTitulo, padre }: {
  filaId: string; tablaId: string; paginaId: string; nombre: string;
  tablaTitulo: string | null; padre: { id: string; titulo: string } | null;
}) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [trabajando, setTrabajando] = useState<'eliminar' | 'duplicar' | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso && !fallo) return;
    const t = setTimeout(() => { setAviso(null); setFallo(null); }, 3500);
    return () => clearTimeout(t);
  }, [aviso, fallo]);

  // A donde se va al eliminar: la página que enseña la base de datos o, si
  // no hay ninguna, la herramienta «Tablas» con esa tabla abierta.
  const destino = padre ? `/paginas/${padre.id}` : `/tablas?tabla=${tablaId}`;
  const irALaBase = () => navigate(destino);

  const eliminar = async () => {
    setTrabajando('eliminar'); setFallo(null);
    try { await eliminarFila(filaId); navigate(destino, { replace: true }); }
    catch (e: any) { setFallo(e.message); setTrabajando(null); }
  };
  const duplicar = async () => {
    setTrabajando('duplicar'); setFallo(null);
    try {
      const j = await duplicarFila(filaId);
      if (j.pagina_id) navigate(`/paginas/${j.pagina_id}`);
      else setAviso('Entrada duplicada');
    } catch (e: any) { setFallo(e.message); }
    setTrabajando(null);
  };

  return (
    <>
      <button type="button" aria-label="Más opciones de esta entrada" title="Más opciones" aria-haspopup="menu" aria-expanded={!!menu}
        onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu(m => (m ? null : { x: r.right - 240, y: r.bottom + 6 })); }}
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
        {trabajando === 'duplicar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
      </button>

      {menu && (
        <MenuAcciones x={menu.x} y={menu.y} onCerrar={() => setMenu(null)} etiqueta="Acciones de la entrada"
          acciones={[
            { etiqueta: 'Duplicar', icono: Copy, onClick: duplicar },
            { etiqueta: 'Copiar enlace', icono: Link2, onClick: () => {
              navigator.clipboard?.writeText(`${window.location.origin}/paginas/${paginaId}`)
                .then(() => setAviso('Enlace copiado'), () => setFallo('No se pudo copiar el enlace.'));
            } },
            { etiqueta: tablaTitulo ? `Ir a «${tablaTitulo.slice(0, 22)}»` : 'Ir a la base de datos', icono: Database, onClick: irALaBase },
            { etiqueta: 'Eliminar entrada', icono: Trash2, peligro: true, onClick: () => setConfirmar(true) },
          ]} />
      )}

      {(aviso || fallo) && createPortal(
        <div role="status" aria-live="polite" onClick={() => { setAviso(null); setFallo(null); }}
          className={`fixed bottom-5 left-1/2 z-[400] flex h-11 max-w-[92vw] -translate-x-1/2 cursor-pointer items-center rounded-xl px-4 text-[13px] font-bold text-white shadow-2xl ${fallo ? 'bg-rose-600' : 'bg-slate-900'}`}
          >
          <span className="truncate">{fallo || aviso}</span>
        </div>, document.body)}

      {confirmar && createPortal(
        <div role="alertdialog" aria-modal="true" aria-label="Eliminar entrada"
          onClick={e => { if (e.target === e.currentTarget && !trabajando) setConfirmar(false); }}
          onKeyDown={e => { if (e.key === 'Escape' && !trabajando) setConfirmar(false); }}
          className="fixed inset-0 z-[400] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-base font-black text-slate-900">¿Eliminar «{nombre || 'Sin título'}»?</p>
            <p className="mt-1.5 text-[13px] leading-snug text-slate-500">
              Desaparece de la base de datos y de sus relaciones. Se guarda 15 días por si te arrepientes.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" autoFocus disabled={!!trabajando} onClick={() => setConfirmar(false)}
                className="h-9 rounded-lg px-3.5 text-[13px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={!!trabajando} onClick={eliminar}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[13px] font-bold text-white hover:bg-rose-700 disabled:opacity-60">
                {trabajando === 'eliminar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar
              </button>
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}
