// The legal documents of the pedal cycle's file (2026-11-24): the 11 documents in order of importance, each opening into
// its editor (`EditorDocumento.tsx`), and the eight of the «Carpeta legal» marked. Only the list and the percentage here.
import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import type { FichaHomologacion } from '../ficha';
import { DOCUMENTOS, type Documento } from './documentos';
import { carpetaLegal, estadoDoc, progresoDocumentos, type Estados } from './progreso';
import { EditorDocumento } from './EditorDocumento';
import { Barra, Chip, Peso, type Ir } from './ui';

function Tarjeta({ d, st, ficha, editable, ir, abierta0 }: { d: Documento; st: Estados; ficha: FichaHomologacion; editable: boolean; ir: Ir; abierta0: boolean }) {
  const [abierta, setAbierta] = useState(abierta0);
  const g = st.docs[d.id];
  const rev = g ? d.secciones.filter(s => g.secciones[s.id]?.revisada).length : 0;
  return (
    <li id={`doc-${d.id}`} className={cn('rounded-lg border bg-white', abierta ? 'border-teal-300' : 'border-slate-200')}>
      <Button variant="ghost" onClick={() => setAbierta(a => !a)} aria-expanded={abierta} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
        <Peso peso={d.peso} />
        <span className="font-mono text-xs font-semibold text-slate-500">{d.codigo}</span>
        <span className="min-w-0 flex-1 basis-56 font-semibold text-slate-900">{d.titulo}</span>
        {d.carpeta && <span className="whitespace-nowrap rounded-full border border-teal-300 bg-teal-50 px-1.5 text-[10px] font-bold uppercase text-teal-800" title="Uno de los 8 documentos de la carpeta legal">Carpeta · {d.carpeta}</span>}
        {editable && <span className="flex w-32 items-center gap-2"><Barra pct={Math.round((rev / d.secciones.length) * 100)} className="flex-1" etiqueta={d.titulo} /><span className="w-9 text-right font-mono text-[11px] text-slate-600">{rev}/{d.secciones.length}</span></span>}
        {editable && <Chip estado={estadoDoc(g, d)} />}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', abierta && 'rotate-180')} />
      </Button>
      {abierta && <div className="border-t border-slate-100 p-2.5"><EditorDocumento d={d} g={g} st={st} ficha={ficha} editable={editable} ir={ir} /></div>}
    </li>
  );
}

export function PanelDocumentos({ st, ficha, editable, ir, abrir }: { st: Estados; ficha: FichaHomologacion; editable: boolean; ir: Ir; abrir?: string | null }) {
  const p = progresoDocumentos(st), carpeta = carpetaLegal(st);
  const orden = [...DOCUMENTOS].sort((a, b) => b.peso - a.peso || DOCUMENTOS.indexOf(a) - DOCUMENTOS.indexOf(b));
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-[13px] text-teal-950">
        <p className="flex items-center gap-1.5 font-semibold"><FileText className="h-4 w-4" />Los documentos se escriben solos y tú los repasas.</p>
        <p className="mt-1">Cada documento arranca como un borrador hecho con las cifras de tu diseño, los datos del fabricante y los resultados de los ensayos. Léelo sección por sección, cámbialo si hace falta y márcala como revisada. Cuando están todas, apruébalo y adjunta la copia firmada. Lo que sale en ámbar («por completar») solo lo puede saber una persona.</p>
      </div>
      {editable && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5"><p className="text-xs font-semibold text-slate-600">Documentos aprobados</p><div className="mt-1 flex items-center gap-2"><Barra pct={p.pct} className="flex-1" etiqueta="Documentos" /><span className="font-mono text-sm font-bold text-slate-900">{p.pct} %</span></div><p className="mt-0.5 text-[11px] text-slate-500">{p.hechos} de {p.total} aprobados</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5"><p className="text-xs font-semibold text-slate-600">Carpeta legal del fabricante</p><div className="mt-1 flex items-center gap-2"><Barra pct={Math.round((carpeta.listos / carpeta.total) * 100)} className="flex-1" etiqueta="Carpeta legal" /><span className="font-mono text-sm font-bold text-slate-900">{carpeta.listos}/{carpeta.total}</span></div><p className="mt-0.5 text-[11px] text-slate-500">los 8 documentos que hay que tener antes de vender</p></div>
        </div>
      )}
      <ul className="flex flex-col gap-1.5">{orden.map(d => <Tarjeta key={d.id} d={d} st={st} ficha={ficha} editable={editable} ir={ir} abierta0={abrir === d.id} />)}</ul>
    </div>
  );
}
