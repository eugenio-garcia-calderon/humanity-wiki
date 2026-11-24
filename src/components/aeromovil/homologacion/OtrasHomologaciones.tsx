// The other homologations (2026-11-24, Eugenio: «el resto de homologaciones de L1 y L6 las vamos a dejar para otro
// momento y que estén ahí en un desplegable lateral por si queremos en algún momento desarrollarlas o consultar su
// normativa»). A drawer on the right of the page with the L1e-A, the heavy L6e/L7e and the three ways to approve, kept
// exactly as they were (their guides are data in `guias.ts`). The pedal cycle is a different category and has its own
// page: nothing of it is mixed in here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleHelp, ExternalLink, X } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { FUENTES, categoria, type IdCategoria } from './normas';
import type { FichaHomologacion } from './ficha';
import { evaluarCategoria } from './evaluar';
import { COLOR } from './PanelHomologacion';
import { GUIAS, VIAS } from './guias';
import { PaginaGuia, ViaDetalle } from './GuiaPagina';

export function OtrasHomologaciones({ ficha, auto, abierto, cerrar }: { ficha: FichaHomologacion; auto: { cat: IdCategoria }; abierto: boolean; cerrar: () => void }) {
  const guias = GUIAS.filter(g => g.id !== 'epac');
  const [sel, setSel] = useState<string>('l1ea');
  const [catPesado, setCatPesado] = useState<IdCategoria | null>(null);
  const g = guias.find(x => x.id === sel) ?? null;
  const catGuia: IdCategoria = g ? (g.id === 'pesado' ? (catPesado ?? (g.categorias.includes(auto.cat) ? auto.cat : g.porDefecto)) : g.porDefecto) : 'L1e-A';
  const ev = useMemo(() => evaluarCategoria(ficha, catGuia), [ficha, catGuia]);
  const evL1 = useMemo(() => evaluarCategoria(ficha, 'L1e-A'), [ficha]);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  }, [abierto, cerrar]);
  useEffect(() => { if (abierto) panel.current?.focus(); }, [abierto]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onMouseDown={e => { if (e.target === e.currentTarget) cerrar(); }}>
      <aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Otras homologaciones" className="flex h-full w-full max-w-4xl flex-col gap-3 overflow-y-auto bg-white p-4 shadow-xl outline-none sm:p-5">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">Otras homologaciones</h2>
            <p className="text-[13px] text-slate-600">L1e-A, cuadriciclos pesados y las vías de aprobación. Son categorías distintas del ciclo de pedales con pedaleo asistido: no se mezclan con su expediente. Se dejan aquí para consultarlas o desarrollarlas más adelante.</p>
          </div>
          <Button variant="ghost" onClick={cerrar} aria-label="Cerrar" className="p-1.5"><X className="h-4 w-4" /></Button>
        </header>

        <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Otras homologaciones">
          {[...guias.map(x => ({ id: x.id, titulo: x.titulo, lema: x.lema })), { id: 'vias', titulo: 'Vías: una unidad, serie corta o tipo UE', lema: 'Qué se pide en cada una, qué significa y quién lo hace' }].map(t => (
            <Button key={t.id} variant="outline" role="tab" aria-selected={sel === t.id} onClick={() => setSel(t.id)}
              className={cn('flex h-auto flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left normal-case tracking-normal', sel === t.id ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-800')}>
              <span className="text-[13px] font-semibold">{t.titulo}</span>
              <span className={cn('text-[11px] font-normal', sel === t.id ? 'text-teal-100' : 'text-slate-500')}>{t.lema}</span>
            </Button>
          ))}
        </div>

        {g && g.id === 'pesado' && (
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Categoría pesada a comparar">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Categoría</span>
            {g.categorias.map(k => (
              <Button key={k} variant="outline" role="radio" aria-checked={k === catGuia} onClick={() => setCatPesado(k)}
                title={categoria(k).nombre} className={cn('px-2 py-1 text-xs normal-case tracking-normal', k === catGuia ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-800')}>{k}{k === auto.cat && ' (la suya)'}</Button>
            ))}
            <span className="flex-1" />
            <a className="inline-flex items-center gap-0.5 text-xs text-teal-700 underline" href={FUENTES.r168.url} target="_blank" rel="noreferrer">Reglamento 168/2013<ExternalLink className="h-3 w-3" /></a>
          </div>
        )}

        {g && (
          <PaginaGuia key={g.id + catGuia} g={g} ev={ev} aviso={g.id === 'l1ea'
            ? <p className={cn('rounded-lg border px-3 py-2 text-[13px]', evL1.bloqueantes.length ? COLOR.no : COLOR.cumple)}>
                {evL1.bloqueantes.length
                  ? <><span className="font-semibold">Tu diseño no entra en L1e-A todavía:</span> {evL1.bloqueantes.map(b => `${b.req.titulo.toLowerCase()} (${b.texto.replace(/\.$/, '')})`).join('; ')}.</>
                  : <><span className="font-semibold">Tu diseño cumple lo que decide L1e-A.</span> Quedan los ensayos, los papeles y las piezas por comprobar.{evL1.cuenta.no > 0 && ` Ojo: ${evL1.cuenta.no === 1 ? 'hay 1 requisito en rojo' : `hay ${evL1.cuenta.no} requisitos en rojo`}.`}</>}
              </p>
            : null} />
        )}

        {sel === 'vias' && (
          <div className="flex flex-col gap-3">
            <p className="flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[13px] text-slate-700"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />Tres formas de conseguir que un vehículo sea legal. Se elige por cuántas unidades quieres y dónde: una (individual), hasta unas decenas al año (serie corta nacional) o muchas, también fuera de España (tipo UE). Pulsa cada una para ver qué se pide y quién lo da.</p>
            <div className="overflow-hidden rounded-lg border border-slate-200 text-[13px]">
              <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 bg-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 md:grid"><span>Vía</span><span>Unidades</span><span>Vale en</span></div>
              <ul className="divide-y divide-slate-100">{VIAS.map(v => <li key={v.id} className="grid gap-x-3 px-3 py-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]"><span className="font-semibold text-slate-900">{v.nombre}</span><span>{v.unidades}</span><span>{v.valeEn}</span></li>)}</ul>
            </div>
            <div className="flex flex-col gap-1.5">{VIAS.map(v => <ViaDetalle key={v.id} v={v} />)}</div>
          </div>
        )}
      </aside>
    </div>
  );
}
