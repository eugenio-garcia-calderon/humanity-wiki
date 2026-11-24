// The tests of the pedal cycle's file (2026-11-24): the 14 tests in order of importance, each opening into its own
// «programita» (`EditorEnsayo.tsx`). Here only the list, the overall percentage and what each test proves.
import { useState } from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import type { FichaHomologacion } from '../ficha';
import { ENSAYOS, type Ensayo } from './ensayos';
import { obligacionesDeEnsayo } from './catalogo';
import { progresoEnsayos, resumenEnsayo, type Estados } from './progreso';
import { EditorEnsayo } from './EditorEnsayo';
import { Barra, Chip, fechaCorta, Peso, type Ir } from './ui';

function Tarjeta({ e, st, ficha, editable, ir, abierta0 }: { e: Ensayo; st: Estados; ficha: FichaHomologacion; editable: boolean; ir: Ir; abierta0: boolean }) {
  const [abierta, setAbierta] = useState(abierta0);
  const g = st.ensayos[e.id];
  const r = resumenEnsayo(g);
  const n = obligacionesDeEnsayo(e.id).length;
  return (
    <li id={`ensayo-${e.id}`} className={cn('rounded-lg border bg-white', abierta ? 'border-teal-300' : 'border-slate-200')}>
      <Button variant="ghost" onClick={() => setAbierta(a => !a)} aria-expanded={abierta} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
        <Peso peso={e.peso} />
        <span className="font-mono text-xs font-semibold text-slate-500">{e.codigo}</span>
        <span className="min-w-0 flex-1 basis-56 font-semibold text-slate-900">{e.titulo}</span>
        {editable && r.intentos > 0 && <span className="text-[11px] text-slate-500">{r.intentos === 1 ? '1 intento' : `${r.intentos} intentos`}{r.fecha ? ` · ${fechaCorta(r.fecha)}` : ''}</span>}
        <span className="text-[11px] text-slate-500">demuestra {n} {n === 1 ? 'obligación' : 'obligaciones'}</span>
        {editable && <Chip estado={r.estado} />}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', abierta && 'rotate-180')} />
      </Button>
      {abierta && <div className="border-t border-slate-100 p-2.5"><EditorEnsayo e={e} g={g} ficha={ficha} fab={st.fab} editable={editable} ir={ir} /></div>}
    </li>
  );
}

export function PanelEnsayos({ st, ficha, editable, ir, abrir }: { st: Estados; ficha: FichaHomologacion; editable: boolean; ir: Ir; abrir?: string | null }) {
  const p = progresoEnsayos(st);
  const orden = [...ENSAYOS].sort((a, b) => b.peso - a.peso || ENSAYOS.indexOf(a) - ENSAYOS.indexOf(b));
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-[13px] text-teal-950">
        <p className="flex items-center gap-1.5 font-semibold"><FlaskConical className="h-4 w-4" />Los ensayos los hacéis vosotros.</p>
        <p className="mt-1">El RD 339/2014 (anexo III) admite que los ensayos los haga el propio fabricante. Pulsa un ensayo, sigue los pasos propuestos, apunta cómo lo hiciste y qué mediste, concluye y fírmalo: el informe se genera solo con lo que has escrito. Ordenados de más a menos importante (●●● es imprescindible).</p>
        <p className="mt-1 text-xs text-teal-900">La ley solo fija la cifra de unos pocos ensayos (250 W, 25 km/h, luces y aristas); en el resto, el método y el criterio vienen de normas técnicas de pago que aún no hemos leído. Por eso cada informe deja por escrito el criterio que adoptas y de dónde lo sacas.</p>
      </div>
      {editable && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
          <span className="text-xs font-semibold text-slate-600">Ensayos completados</span>
          <Barra pct={p.pct} className="flex-1" etiqueta="Ensayos completados" />
          <span className="font-mono text-sm font-bold text-slate-900">{p.pct} %</span>
          <span className="text-xs text-slate-500">{p.hechos}/{p.total} firmados y conformes</span>
        </div>
      )}
      <ul className="flex flex-col gap-1.5">{orden.map(e => <Tarjeta key={e.id} e={e} st={st} ficha={ficha} editable={editable} ir={ir} abierta0={abrir === e.id} />)}</ul>
    </div>
  );
}
