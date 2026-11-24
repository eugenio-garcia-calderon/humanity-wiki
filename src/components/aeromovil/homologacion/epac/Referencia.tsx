// The reference of the pedal cycle's page (2026-11-24, Eugenio: «almacena toda esta información que te he pasado, aunque
// sean desplegables, para que sea compacta pero que no se pierda información y que podamos recurrir a ella en un
// futuro»). Three things: what an inspector can ask for (a checklist tied to the matrix), the text he pasted kept in full
// with what was checked against the law beside each part, and the written guide of this way (the norm as a table).
import { useMemo, useState } from 'react';
import { BookOpen, ClipboardCheck, Search } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import type { Evaluacion } from '../evaluar';
import { GUIAS } from '../guias';
import { PaginaGuia, VEREDICTO } from '../GuiaPagina';
import { obligacion } from './catalogo';
import { INSPECCION, REFERENCIA } from './referencia';
import { progresoObligacion, type Estados } from './progreso';
import { Barra, Desplegable, Peso, Texto, type Ir } from './ui';

export function Referencia({ st, editable, ev, ir }: { st: Estados; editable: boolean; ev: Evaluacion; ir: Ir }) {
  const [q, setQ] = useState('');
  const guia = GUIAS.find(g => g.id === 'epac');
  const filas = useMemo(() => INSPECCION.map(r => {
    const os = r.obligaciones.map(id => obligacion(id)).filter((o): o is NonNullable<typeof o> => !!o);
    const ps = os.map(o => progresoObligacion(o, st)).filter((p): p is number => p != null);
    return { ...r, os, pct: ps.length ? Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100) : 100 };
  }), [st]);
  const grupos = useMemo(() => {
    const t = q.trim().toLowerCase();
    const lista = REFERENCIA.filter(e => !t || `${e.titulo} ${e.md}`.toLowerCase().includes(t));
    const por = new Map<string, typeof lista>();
    for (const e of lista) por.set(e.grupo, [...(por.get(e.grupo) ?? []), e]);
    return [...por.entries()];
  }, [q]);
  const nContrastes = REFERENCIA.reduce((n, e) => n + e.contraste.length, 0);
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-label="Qué te pueden pedir en una inspección">
        <h3 className="flex items-center gap-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900"><ClipboardCheck className="h-4 w-4 text-teal-700" />Lo que te pueden pedir en una inspección<span className="text-xs font-normal text-slate-500">y con qué lo enseñas</span></h3>
        <ul className="flex flex-col gap-1">
          {filas.map(r => (
            <li key={r.pregunta} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]">
              <span className="min-w-0 flex-1 basis-56"><span className="font-semibold text-slate-900">{r.pregunta}</span><span className="block text-xs text-slate-600">Enseñas: {r.entregas}</span></span>
              <span className="flex items-center gap-1">{r.os.map(o => <Button key={o.id} variant="outline" onClick={() => ir('matriz', o.id)} title={o.titulo} className="gap-1 px-1.5 py-0.5 text-[11px] normal-case tracking-normal"><Peso peso={o.peso} />{o.id}</Button>)}</span>
              {editable && <span className="flex w-28 items-center gap-2"><Barra pct={r.pct} className="flex-1" etiqueta={r.pregunta} /><span className="w-9 text-right font-mono text-[11px] text-slate-600">{r.pct}%</span></span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-label="Texto aportado">
        <h3 className="flex flex-wrap items-center gap-x-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900"><BookOpen className="h-4 w-4 text-teal-700" />El texto que aportaste, guardado entero<span className="text-xs font-normal text-slate-500">{REFERENCIA.length} apartados · {nContrastes} comprobaciones contra la ley</span></h3>
        <p className="text-xs text-slate-600">Nada se ha perdido ni resumido: cada apartado está tal cual lo pegaste. Debajo de cada uno, lo que se ha contrastado con los textos legales (confirmado, con matiz o no comprobado).</p>
        <label className="relative"><Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en el texto: placa, 250 W, reflectores…" aria-label="Buscar en el texto aportado" className="w-full rounded-md border border-slate-300 py-1 pl-7 pr-2 text-[13px]" /></label>
        {grupos.map(([grupo, es]) => (
          <div key={grupo} className="flex flex-col gap-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{grupo}</h4>
            {es.map(e => (
              <Desplegable key={e.id + q} abierto={!!q.trim()} titulo={e.titulo} derecha={e.contraste.length > 0 ? <span className="flex items-center gap-0.5">{(['confirmado', 'matiz', 'no comprobado'] as const).map(v => { const n = e.contraste.filter(c => c.v === v).length; return n ? <span key={v} className={cn('rounded-full border px-1.5 text-[10px] font-bold', VEREDICTO[v].c)} title={VEREDICTO[v].t}>{n}</span> : null; })}</span> : undefined}>
                <Texto md={e.md} />
                {e.contraste.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-2">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lo que se contrastó con la ley</h5>
                    {e.contraste.map(c => (
                      <p key={c.texto} className="flex items-start gap-2 text-[13px]"><span className={cn('mt-0.5 shrink-0 whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', VEREDICTO[c.v].c)}>{VEREDICTO[c.v].t}</span><span>{c.texto}</span></p>
                    ))}
                  </div>
                )}
              </Desplegable>
            ))}
          </div>
        ))}
        {!grupos.length && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[13px] text-slate-600">Ningún apartado contiene «{q}».</p>}
      </section>

      {guia && (
        <section className="flex flex-col gap-2" aria-label="La vía en detalle">
          <Desplegable titulo="La vía en detalle: la norma en tabla, los trámites y el paso a paso" resumen="Qué dice la norma frente a tu diseño, qué se pide y qué no, y lo contrastado con los textos legales">
            <PaginaGuia g={guia} ev={ev} aviso={null} />
          </Desplegable>
        </section>
      )}
    </div>
  );
}
