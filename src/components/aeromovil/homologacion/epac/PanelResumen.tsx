// The summary of the pedal cycle's file (2026-11-24, Eugenio: «el ingeniero sepa qué es lo que le hace falta, cómo está de
// avanzado o de retrasado en cuanto a porcentajes, del 0 al 100 % de completado en cada una de las cosas que tiene que
// hacer antes de poder vender la primera unidad»). One screen: how far along it is, what is missing in order of
// importance, the eight documents of the legal folder, and the maker's details that every document and plate needs.
import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, CircleDot, ShieldCheck } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import { CAMPOS_FABRICANTE, FABRICANTE_VACIO, type Fabricante } from './tipos';
import { cambiar, CLAVE_FABRICANTE } from './almacen';
import { carpetaLegal, estadoEnsayo, estadoFabricante, hechosSinArchivo, progresoDocumentos, progresoEnsayos, progresoImprescindible, progresoTotal, queFalta, type Estados } from './progreso';
import { DOCUMENTOS } from './documentos';
import { ENSAYOS } from './ensayos';
import { TIPOS } from './catalogo';
import { Barra, Chip, Peso, type Ir } from './ui';

const Cifra = ({ titulo, pct, detalle, onClick, destacada }: { titulo: string; pct: number; detalle: string; onClick?: () => void; destacada?: boolean }) => (
  <Button variant="ghost" onClick={onClick} disabled={!onClick}
    className={cn('flex h-auto w-full flex-col items-stretch gap-1.5 whitespace-normal rounded-lg border p-3 text-left normal-case tracking-normal', destacada ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
    <span className="flex items-baseline justify-between gap-2"><span className="min-w-0 text-[13px] font-semibold text-slate-900">{titulo}</span><span className="whitespace-nowrap font-mono text-xl font-bold text-slate-900">{pct}<span className="text-sm"> %</span></span></span>
    <Barra pct={pct} etiqueta={titulo} className="h-2.5" />
    <span className="text-[11px] font-normal text-slate-600">{detalle}</span>
  </Button>
);

function FormularioFabricante({ fab, editable }: { fab: Fabricante; editable: boolean }) {
  const e = estadoFabricante(fab);
  const poner = (id: keyof Fabricante, valor: string) => cambiar<Fabricante>(CLAVE_FABRICANTE, FABRICANTE_VACIO, v => ({ ...v, [id]: valor }));
  return (
    <section id="epac-fabricante" className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3" aria-label="Datos del fabricante">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Datos del fabricante</h3>
        <span className="flex items-center gap-2 text-xs text-slate-600"><Barra pct={e.pct} className="w-24" etiqueta="Datos del fabricante" />{e.hecho}/{e.total} <Chip estado={e.hecho === e.total ? 'hecho' : e.hecho ? 'enCurso' : 'pendiente'} /></span>
      </div>
      <p className="text-xs text-slate-600">Salen en la placa, la declaración de conformidad, el manual y la ficha técnica. Se escriben una vez y todos los documentos los usan. No pongas aquí números de documentos de identidad.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CAMPOS_FABRICANTE.map(c => (
          <label key={c.id} className={cn('flex flex-col gap-0.5 text-xs font-semibold text-slate-700', c.grande && 'sm:col-span-2')}>
            <span>{c.etiqueta}{c.obligatorio ? '' : ' (opcional)'}</span>
            <input value={fab[c.id]} disabled={!editable} maxLength={300} onChange={ev => poner(c.id, ev.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-[13px] font-normal text-slate-900 disabled:bg-slate-50" />
            <span className="text-[11px] font-normal text-slate-500">{c.ayuda}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function PanelResumen({ st, editable, ir }: { st: Estados; editable: boolean; ir: Ir }) {
  const [todas, setTodas] = useState(false);
  const total = progresoTotal(st), imp = progresoImprescindible(st);
  const ens = progresoEnsayos(st), docs = progresoDocumentos(st), fab = estadoFabricante(st.fab), carpeta = carpetaLegal(st);
  const falta = queFalta(st);
  const sinArchivo = hechosSinArchivo(st);
  const visibles = todas ? falta : falta.slice(0, 10);
  const imprescindiblesFaltan = falta.filter(f => f.o.peso === 3).length;
  const nombreDoc = (id: string) => DOCUMENTOS.find(d => d.id === id)?.codigo ?? id;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-[13px] text-emerald-950">
        <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4" />Como fabricante, podéis hacerlo todo vosotros.</p>
        <p className="mt-1">El ciclo de pedales con pedaleo asistido no se homologa ante la Administración: lo certifica el propio fabricante (RD 339/2014, art. 4). No hace falta un laboratorio ni un permiso previo; lo único que hay que hacer son <strong>los ensayos</strong>, guardar sus informes y tener los papeles en orden antes de vender la primera unidad. Esta página es esa lista, con su porcentaje.</p>
      </div>

      {!editable && (
        <p className="flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />Estás viendo el catálogo sin expediente: o se está abriendo todavía, o no tienes permiso. Los ensayos, los documentos y los archivos solo los rellena el dueño del Aeromóvil.</p>
      )}

      {editable && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Cifra destacada titulo="Listo para vender la primera unidad" pct={imp} detalle={imprescindiblesFaltan ? `Lo imprescindible (●●●): faltan ${imprescindiblesFaltan} pruebas o papeles` : 'Todo lo imprescindible está hecho'} onClick={() => ir('matriz')} />
            <Cifra titulo="Matriz de conformidad" pct={total} detalle={`${falta.length} evidencias por hacer · cada obligación legal con su prueba`} onClick={() => ir('matriz')} />
            <Cifra titulo="Ensayos" pct={ens.pct} detalle={`${ens.hechos} de ${ens.total} firmados y conformes`} onClick={() => ir('ensayos')} />
            <Cifra titulo="Documentos legales" pct={docs.pct} detalle={`${docs.hechos} de ${docs.total} revisados y aprobados`} onClick={() => ir('documentos')} />
            <Cifra titulo="Carpeta legal del fabricante" pct={Math.round((carpeta.listos / carpeta.total) * 100)} detalle={`${carpeta.listos} de ${carpeta.total} documentos listos para enseñar`} onClick={() => ir('documentos')} />
            <Cifra titulo="Datos del fabricante" pct={fab.pct} detalle={`${fab.hecho} de ${fab.total} datos obligatorios`} onClick={() => document.getElementById('epac-fabricante')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          </div>
          <p className="text-[11px] text-slate-500">Cómo se cuenta: cada evidencia vale 1 si está hecha y 0,5 si está en curso. Cada obligación pesa 3 (imprescindible), 2 o 1 según su importancia. Lo que depende de un ensayo o de un documento se marca solo cuando lo terminas. Lo que no aplica, con su motivo escrito, no cuenta.</p>

          {sinArchivo.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {sinArchivo.length === 1 ? 'Hay 1 evidencia marcada como hecha' : `Hay ${sinArchivo.length} evidencias marcadas como hechas`} sin ningún archivo. En una inspección hay que poder enseñarlas: adjunta el plano, el cálculo o el informe. <Button variant="ghost" onClick={() => ir('matriz')} className="inline p-0 text-xs font-semibold normal-case tracking-normal text-amber-900 underline">Verlas en la matriz</Button></p>
          )}

          <section className="flex flex-col gap-2" aria-label="Lo que falta">
            <h3 className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">Lo que falta, por orden de importancia<span className="text-xs font-normal text-slate-500">{falta.length} evidencias</span></h3>
            {!falta.length && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-900"><CheckCircle2 className="mr-1 inline h-4 w-4" />No falta nada en el expediente. Antes de vender: repasa que cada archivo se abre y que los ensayos son de la versión final del vehículo.</p>}
            <ul className="flex flex-col gap-1">
              {visibles.map(f => (
                <li key={`${f.o.id}${f.h.id}`}>
                  <Button variant="ghost" onClick={() => ir('matriz', f.o.id)} className="flex h-auto w-full items-center gap-2 whitespace-normal rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
                    {f.estado === 'enCurso' ? <CircleDot className="h-4 w-4 shrink-0 text-amber-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                    <Peso peso={f.o.peso} />
                    <span className="min-w-0 flex-1"><span className="font-semibold text-slate-900">{f.o.titulo}</span><span className="block text-xs text-slate-600">{TIPOS[f.h.tipo].nombre}: {f.h.que}</span></span>
                    <span className="font-mono text-[11px] text-slate-500">{f.o.id}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Button>
                </li>
              ))}
            </ul>
            {falta.length > 10 && <Button variant="outline" onClick={() => setTodas(v => !v)} className="w-fit px-2.5 py-1 text-xs normal-case tracking-normal">{todas ? 'Ver solo las 10 primeras' : `Ver las ${falta.length}`}</Button>}
          </section>

          <section className="flex flex-col gap-2" aria-label="Carpeta legal del fabricante">
            <h3 className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">Carpeta legal del fabricante<span className="text-xs font-normal text-slate-500">los 8 documentos que hay que tener listos antes de vender la primera unidad</span></h3>
            <ul className="flex flex-col gap-1">
              {carpeta.filas.map(f => (
                <li key={f.n} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px]">
                  {f.listo ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                  <span className="font-mono text-xs text-slate-500">{f.n}</span>
                  <span className="min-w-0 flex-1 basis-56 text-slate-900">{f.titulo}</span>
                  {f.docs.map(id => <Button key={id} variant="outline" onClick={() => ir('documentos', id)} className="px-2 py-0.5 text-[11px] normal-case tracking-normal">{nombreDoc(id)}</Button>)}
                  <Chip estado={f.listo ? 'hecho' : 'pendiente'}>{f.listo ? 'Listo' : 'Falta'}</Chip>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2" aria-label="Ensayos pendientes">
            <h3 className="border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">Los ensayos que hay que hacer <span className="text-xs font-normal text-slate-500">{ENSAYOS.length} en total</span></h3>
            <div className="flex flex-wrap gap-1.5">
              {ENSAYOS.map(e => {
                const estado = estadoEnsayo(st.ensayos[e.id]);
                return <Button key={e.id} variant="outline" onClick={() => ir('ensayos', e.id)} className="gap-1.5 px-2 py-1 text-xs normal-case tracking-normal"><Peso peso={e.peso} />{e.codigo}<Chip estado={estado} /></Button>;
              })}
            </div>
          </section>
        </>
      )}

      <FormularioFabricante fab={st.fab} editable={editable} />
    </div>
  );
}
