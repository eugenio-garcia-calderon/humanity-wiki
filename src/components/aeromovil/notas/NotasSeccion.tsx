/**
 * The notes of one section («desplegable») — 2026-11-17. `Bloque` (controles.tsx) shows `BotonNotas` in its header and,
 * when it is pressed, `PanelNotas`. Each note: text, date and author (the account's name, or «Anónimo»).
 * The data: `almacen.ts`.
 *
 * WHY A DIALOG ON `document.body` AND A `span` FOR THE ICON: for anyone but the Aeromóvil's owner the whole side panel
 * sits inside `<fieldset disabled>` (pages/Aeromovil.tsx, read-only sliders). A disabled fieldset disables every
 * button and textarea inside it, so inline notes worked for the owner only — found in the headless test with an
 * anonymous visitor. The icon is a `span role="button"` (not a form control) and the panel is portalled out of it.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, StickyNote, X } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { useAuth, useHayProveedorDeSesion } from '../../../contexts/AuthContext';
import { anadirNota, cambiarNota, quitarNota, useNotasSeccion, type Nota } from './almacen';

/** The account looking, or null. The page may run without the session provider (a custom domain): then nobody. */
function useUsuario(): { id: string | null } {
  const hay = useHayProveedorDeSesion();
  // Whether the provider is there never changes during a page's life, so the hook order is stable.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const u = hay ? useAuth().user : null;
  return { id: u?.id ?? null };
}

const fecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** The header's notes icon with the count. Nothing outside the Aeromóvil page (no vehicle open). */
export function BotonNotas({ seccion, abierto, alAlternar }: { seccion: string; abierto: boolean; alAlternar: () => void }) {
  const { id } = useUsuario();
  const { activo, notas } = useNotasSeccion(seccion, id);
  if (!activo) return null;
  const n = notas.length;
  const etiqueta = `Notas de «${seccion}»${n ? `: ${n}` : ''}`;
  return (
    <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); alAlternar(); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alAlternar(); } }}
      aria-expanded={abierto} aria-haspopup="dialog" aria-label={etiqueta} title={n ? `${n} ${n === 1 ? 'nota' : 'notas'} en esta sección` : 'Añadir una nota a esta sección'}
      className={cn('inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs normal-case tracking-normal transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300', abierto ? 'bg-amber-50 text-amber-800' : n ? 'text-amber-700' : 'text-slate-300 hover:text-slate-500')}>
      <StickyNote className="h-3.5 w-3.5" />
      {n > 0 && <span className="font-mono text-[11px] font-semibold tabular-nums">{n}</span>}
    </span>
  );
}

function FilaNota({ n }: { n: Nota }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(n.texto);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const hacer = async (f: () => Promise<void>) => {
    setOcupado(true); setError('');
    try { await f(); } catch (e: any) { setError(e?.message || 'No se ha podido.'); } finally { setOcupado(false); }
  };
  return (
    <li className="rounded-lg border border-amber-200/70 bg-amber-50/50 px-2.5 py-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-[11px] text-slate-500">
        <span><span className="font-semibold text-slate-700">{n.autor}</span>{n.local && ' · solo en este dispositivo'}</span>
        <span className="tabular-nums" title={n.editada ? `Editada el ${fecha(n.editada)}` : undefined}>{fecha(n.fecha)}{n.editada && ' · editada'}</span>
      </div>
      {editando
        ? <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} maxLength={2000} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px]" />
        : <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-snug text-slate-800">{n.texto}</p>}
      {error && <p className="mt-1 text-[11px] text-red-700">{error}</p>}
      {n.mia && (
        <div className="mt-1 flex justify-end gap-1">
          {editando ? <>
            <Button variant="ghost" disabled={ocupado} onClick={() => { setEditando(false); setTexto(n.texto); }} className="px-2 py-0.5 text-[11px] normal-case tracking-normal">Cancelar</Button>
            <Button variant="outline" disabled={ocupado || !texto.trim()} onClick={() => hacer(async () => { await cambiarNota(n, texto.trim()); setEditando(false); })} className="px-2 py-0.5 text-[11px] normal-case tracking-normal">Guardar</Button>
          </> : <>
            <Button variant="ghost" disabled={ocupado} onClick={() => { setTexto(n.texto); setEditando(true); }} className="px-2 py-0.5 text-[11px] normal-case tracking-normal text-slate-500">Editar</Button>
            <Button variant="ghost" disabled={ocupado} onClick={() => { if (window.confirm('¿Borrar esta nota?')) void hacer(() => quitarNota(n)); }} className="px-2 py-0.5 text-[11px] normal-case tracking-normal text-slate-500 hover:text-red-700">Borrar</Button>
          </>}
        </div>
      )}
    </li>
  );
}

/** The section's notes and a box to add one. */
export function PanelNotas({ seccion, alCerrar }: { seccion: string; alCerrar: () => void }) {
  const { id } = useUsuario();
  const { activo, conDiseno, estado, notas } = useNotasSeccion(seccion, id);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [alCerrar]);
  if (!activo) return null;
  const anadir = async () => {
    const t = texto.trim(); if (!t) return;
    setOcupado(true); setError('');
    try { await anadirNota(seccion, t, !!id); setTexto(''); } catch (e: any) { setError(e?.message || 'No se ha podido guardar la nota.'); } finally { setOcupado(false); }
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-2 sm:items-center" onMouseDown={e => { if (e.target === e.currentTarget) alCerrar(); }}>
    <div role="dialog" aria-modal="true" className="flex max-h-[85vh] w-full max-w-md flex-col gap-1.5 overflow-hidden rounded-xl border border-amber-200 bg-white p-3 text-xs shadow-xl" aria-label={`Notas de «${seccion}»`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600"><StickyNote className="h-3.5 w-3.5 text-amber-700" />Notas · {seccion}</h4>
        <Button variant="ghost" onClick={alCerrar} aria-label="Cerrar las notas" className="px-1.5 py-1"><X className="h-4 w-4" /></Button>
      </div>
      {estado === 'cargando' && !notas.length && <p className="flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Cargando notas…</p>}
      {estado === 'error' && <p className="text-amber-800">No se han podido leer las notas guardadas en la web; las de este dispositivo sí se ven.</p>}
      {notas.length > 0 && <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">{notas.map(n => <FilaNota key={n.id} n={n} />)}</ul>}
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} maxLength={2000} autoFocus placeholder="Escribe una nota sobre esta sección…"
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void anadir(); } }}
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-[13px]" />
      {error && <p className="text-[11px] text-red-700">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] leading-snug text-slate-400">
          {id ? `Se guarda en la web ${conDiseno ? 'con este diseño' : 'con este vehículo (no hay un diseño guardado abierto)'}, con tu nombre y la fecha; la puede leer quien abra la página.` : 'Sin sesión se firma «Anónimo» y se queda solo en este dispositivo. Inicia sesión para que la vean los demás con tu nombre.'}
        </span>
        <Button variant="outline" disabled={ocupado || !texto.trim()} onClick={() => void anadir()} className="shrink-0 px-2.5 py-1 text-[11px] normal-case tracking-normal">Añadir nota</Button>
      </div>
    </div>
    </div>,
    document.body,
  );
}
