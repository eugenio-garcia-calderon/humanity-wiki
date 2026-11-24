// The page of the pedal cycle with pedal assistance (EN 15194), the one homologation Eugenio is working on now
// (2026-11-24). It is NOT an approval: the maker certifies it himself (RD 339/2014), so the page is the maker's file: what
// the law asks (the conformity matrix), the tests, the documents, the files, and the percentage done of each, so the
// engineer sees how far he is from selling the first unit. Six sections on a side menu (a row of tabs on a phone).
// The file is the owner's: it loads and saves only when `puedeDecidir`; anybody else sees the catalogue read-only.
import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, CircleCheck, FlaskConical, FolderOpen, LayoutDashboard, ListChecks, Loader2, Save, ScrollText, X } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import { categoria } from '../normas';
import { evaluarCategoria } from '../evaluar';
import type { FichaHomologacion } from '../ficha';
import { COLOR, AVISO_HOMOLOGACION } from '../PanelHomologacion';
import { cerrarAviso, guardarYa, useExpediente } from './almacen';
import { progresoDocumentos, progresoEnsayos, progresoImprescindible, progresoTotal } from './progreso';
import { PanelResumen } from './PanelResumen';
import { MatrizConformidad } from './MatrizConformidad';
import { PanelEnsayos } from './PanelEnsayos';
import { PanelDocumentos } from './PanelDocumentos';
import { PanelArchivos } from './PanelArchivos';
import { Referencia } from './Referencia';
import { Barra, type Ir, type Seccion } from './ui';

const SECCIONES: { id: Seccion; nombre: string; lema: string; icono: typeof LayoutDashboard }[] = [
  { id: 'resumen', nombre: 'Resumen', lema: 'cuánto falta y qué', icono: LayoutDashboard },
  { id: 'matriz', nombre: 'Matriz de conformidad', lema: 'cada obligación con su prueba', icono: ListChecks },
  { id: 'ensayos', nombre: 'Ensayos', lema: 'hacerlos, apuntarlos, firmarlos', icono: FlaskConical },
  { id: 'documentos', nombre: 'Documentos legales', lema: 'generarlos y aprobarlos', icono: ScrollText },
  { id: 'archivos', nombre: 'Archivos', lema: 'todo lo adjuntado', icono: FolderOpen },
  { id: 'normativa', nombre: 'Normativa y referencia', lema: 'tu texto y la ley', icono: BookOpen },
];

export function PaginaEpac({ ficha, puedeDecidir }: { ficha: FichaHomologacion; puedeDecidir: boolean }) {
  const exp = useExpediente(puedeDecidir);
  const editable = puedeDecidir && exp.carga === 'listo';
  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const [abrir, setAbrir] = useState<string | null>(null);
  const cabecera = useRef<HTMLDivElement>(null);
  const ev = useMemo(() => evaluarCategoria(ficha, 'EPAC'), [ficha]);
  const c = categoria('EPAC');
  const ir: Ir = useCallback((s, id) => {
    setSeccion(s); setAbrir(id && id !== 'fab' ? id : null);
    setTimeout(() => {
      if (id === 'fab') document.getElementById('epac-fabricante')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else cabecera.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);
  const st = exp.estados;
  const pct: Partial<Record<Seccion, number>> = editable ? { resumen: progresoImprescindible(st), matriz: progresoTotal(st), ensayos: progresoEnsayos(st).pct, documentos: progresoDocumentos(st).pct } : {};
  const guardando = exp.pendientes > 0;
  return (
    <div className="flex flex-col gap-3" ref={cabecera}>
      <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">
        <p className="font-semibold text-slate-900">{c.nombre}</p>
        <p>{c.resumen}</p>
        <p className="text-xs text-slate-600"><span className="font-semibold">Ejemplos:</span> {c.ejemplos} · <span className="font-semibold">Permiso:</span> {c.permiso}</p>
      </div>
      <p className={cn('rounded-lg border px-3 py-2 text-[13px]', ev.bloqueantes.length ? COLOR.no : COLOR.cumple)}>
        {ev.bloqueantes.length
          ? <><span className="font-semibold">Tu diseño 3D no entra en esta vía todavía:</span> {ev.bloqueantes.map(b => `${b.req.titulo.toLowerCase()} (${b.texto.replace(/\.$/, '')})`).join('; ')}.</>
          : <><span className="font-semibold">Tu diseño 3D cumple lo que decide esta vía.</span> Quedan los ensayos, los papeles y las piezas por comprobar.{ev.cuenta.no > 0 && ` Ojo: ${ev.cuenta.no === 1 ? 'hay 1 requisito en rojo' : `hay ${ev.cuenta.no} requisitos en rojo`} en la matriz.`}</>}
      </p>
      <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{AVISO_HOMOLOGACION}</p>

      {puedeDecidir && (
        <div className="flex flex-wrap items-center gap-2 text-xs" role="status" aria-live="polite">
          {exp.carga === 'cargando' && <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600"><Loader2 className="h-3.5 w-3.5 animate-spin" />Abriendo el expediente…</span>}
          {exp.carga === 'listo' && (guardando
            ? <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900"><Loader2 className="h-3.5 w-3.5 animate-spin" />Guardando {exp.pendientes === 1 ? '1 cambio' : `${exp.pendientes} cambios`}…<Button variant="ghost" onClick={guardarYa} className="gap-1 px-1.5 py-0 text-xs font-semibold normal-case tracking-normal underline"><Save className="h-3 w-3" />Guardar ahora</Button></span>
            : <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800"><CircleCheck className="h-3.5 w-3.5" />Todo guardado en el servidor</span>)}
          {(exp.carga === 'error' || exp.carga === 'sinAcceso') && (
            <span className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-800" role="alert">{exp.mensaje}
              {exp.carga === 'error' && <Button variant="outline" onClick={() => void exp.recargar()} className="px-2 py-0.5 text-xs normal-case tracking-normal">Reintentar</Button>}</span>
          )}
          {exp.aviso && (
            <span className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-900" role="alert">{exp.aviso}
              <Button variant="ghost" onClick={cerrarAviso} aria-label="Cerrar el aviso" className="p-0.5"><X className="h-3.5 w-3.5" /></Button></span>
          )}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Secciones del expediente" className="flex gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-2 lg:flex-col lg:overflow-visible">
          {SECCIONES.map(s => {
            const activa = seccion === s.id, Icono = s.icono, p = pct[s.id];
            return (
              <Button key={s.id} variant="outline" aria-current={activa ? 'page' : undefined} onClick={() => ir(s.id)}
                className={cn('flex h-auto shrink-0 flex-col items-stretch gap-1 whitespace-normal px-2.5 py-2 text-left normal-case tracking-normal lg:w-full', activa ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'bg-white text-slate-800')}>
                <span className="flex items-center gap-2"><Icono className="h-4 w-4 shrink-0" /><span className="text-[13px] font-semibold">{s.nombre}</span>{p != null && <span className={cn('ml-auto font-mono text-[11px]', activa ? 'text-teal-100' : 'text-slate-600')}>{p}%</span>}</span>
                <span className={cn('hidden text-[11px] font-normal lg:block', activa ? 'text-teal-100' : 'text-slate-500')}>{s.lema}</span>
                {p != null && <Barra pct={p} className="hidden h-1.5 lg:block" etiqueta={s.nombre} />}
              </Button>
            );
          })}
        </nav>
        <div className="min-w-0" role="region" aria-label={SECCIONES.find(s => s.id === seccion)!.nombre}>
          {seccion === 'resumen' && <PanelResumen st={st} editable={editable} ir={ir} />}
          {seccion === 'matriz' && <MatrizConformidad key={abrir ?? 'm'} st={st} editable={editable} ev={ev} ir={ir} abrir={abrir} />}
          {seccion === 'ensayos' && <PanelEnsayos key={abrir ?? 'e'} st={st} ficha={ficha} editable={editable} ir={ir} abrir={abrir} />}
          {seccion === 'documentos' && <PanelDocumentos key={abrir ?? 'd'} st={st} ficha={ficha} editable={editable} ir={ir} abrir={abrir} />}
          {seccion === 'archivos' && <PanelArchivos st={st} editable={editable} ir={ir} />}
          {seccion === 'normativa' && <Referencia st={st} editable={editable} ev={ev} ir={ir} />}
        </div>
      </div>
    </div>
  );
}
