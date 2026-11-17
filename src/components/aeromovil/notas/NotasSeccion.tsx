/**
 * The notes of one section («desplegable») — 2026-11-17. `Bloque` (controles.tsx) shows `BotonNotas` in its header and,
 * when it is pressed, `PanelNotas` under it. Each note: text, date and author (the account's name, or «Anónimo»).
 * The data: `almacen.ts`.
 */
import { useState } from 'react';
import { Loader2, StickyNote } from 'lucide-react';
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
  return (
    <Button variant="ghost" onClick={alAlternar} aria-expanded={abierto} aria-label={`Notas de «${seccion}»${n ? `: ${n}` : ''}`} title={n ? `${n} ${n === 1 ? 'nota' : 'notas'} en esta sección` : 'Añadir una nota a esta sección'}
      className={cn('shrink-0 gap-0.5 px-1.5 py-1 normal-case tracking-normal', abierto ? 'bg-amber-50 text-amber-800' : n ? 'text-amber-700' : 'text-slate-300 hover:text-slate-500')}>
      <StickyNote className="h-3.5 w-3.5" />
      {n > 0 && <span className="font-mono text-[11px] font-semibold tabular-nums">{n}</span>}
    </Button>
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
export function PanelNotas({ seccion }: { seccion: string }) {
  const { id } = useUsuario();
  const { activo, conDiseno, estado, notas } = useNotasSeccion(seccion, id);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  if (!activo) return null;
  const anadir = async () => {
    const t = texto.trim(); if (!t) return;
    setOcupado(true); setError('');
    try { await anadirNota(seccion, t, !!id); setTexto(''); } catch (e: any) { setError(e?.message || 'No se ha podido guardar la nota.'); } finally { setOcupado(false); }
  };
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-white p-2 text-xs" aria-label={`Notas de «${seccion}»`}>
      {estado === 'cargando' && !notas.length && <p className="flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Cargando notas…</p>}
      {estado === 'error' && <p className="text-amber-800">No se han podido leer las notas guardadas en la web; las de este dispositivo sí se ven.</p>}
      {notas.length > 0 && <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">{notas.map(n => <FilaNota key={n.id} n={n} />)}</ul>}
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} maxLength={2000} placeholder="Escribe una nota sobre esta sección…"
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
  );
}
