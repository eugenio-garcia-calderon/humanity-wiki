// The editor of one legal document of the pedal cycle's file (2026-11-24, Eugenio: «tiene que haber un generador y un
// editor de esos documentos para que entre la IA y el ingeniero podamos ir resolviéndolos»). Each section starts as the
// generator's draft (written from the 3D design, the maker's details and the state of the matrix and the tests). The
// engineer reads it, edits it if it needs it and marks it «revisada». Marking it freezes the text that was reviewed, so
// an approved document never changes by itself when the design's numbers do; «Volver al borrador automático» undoes that.
// A `[por completar: …]` mark is something only a person can know: a section with one cannot be marked, and the document
// cannot be approved. The draft is a proposal to check, not legal advice.
import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, FileSignature, Lock, Pencil, Printer, RotateCcw } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import type { FichaHomologacion } from '../ficha';
import { obligacionesDeDoc } from './catalogo';
import type { Documento } from './documentos';
import { cambiar, claveDoc } from './almacen';
import { contextoDoc, estadoDoc, type Estados } from './progreso';
import { conPendientes, type DocGuardado, type SeccionGuardada } from './tipos';
import { abrirHtml, descargarHtml, paginaHtml } from './exportar';
import { Adjuntos } from './Adjuntos';
import { Area, Barra, Chip, fechaCorta, hoyIso, hoyLargo, Peso, Texto, type Ir } from './ui';

export const AVISO_DOCUMENTO = 'Borrador generado a partir del diseño y de los datos del fabricante: es una propuesta para revisar, no asesoramiento jurídico. Lo que aparece como «por completar» solo lo puede saber una persona.';

const editar = (d: Documento, f: (v: DocGuardado) => DocGuardado) => cambiar<DocGuardado>(claveDoc(d.id), { secciones: {} }, f);
const editarSeccion = (d: Documento, id: string, f: (s: SeccionGuardada) => SeccionGuardada) => editar(d, v => ({ ...v, secciones: { ...v.secciones, [id]: f(v.secciones[id] ?? {}) } }));

/** The text a section has now: the engineer's, or the generator's draft. */
export function textosDeDocumento(d: Documento, g: DocGuardado | undefined, st: Estados, ficha: FichaHomologacion) {
  const c = contextoDoc(st, ficha, hoyLargo());
  return d.secciones.map(s => ({ s, texto: g?.secciones[s.id]?.texto ?? s.generar(c), propio: g?.secciones[s.id]?.texto != null, revisada: !!g?.secciones[s.id]?.revisada }));
}

export function paginaDocumento(d: Documento, textos: ReturnType<typeof textosDeDocumento>, st: Estados, g: DocGuardado | undefined) {
  const f = st.fab;
  return {
    titulo: `${d.codigo} · ${d.titulo}`,
    subtitulo: `${f.razon || 'Fabricante por completar'} · ${f.marca || ''} ${f.modelo || ''}`.trim(),
    aviso: g?.aprobado ? undefined : AVISO_DOCUMENTO,
    secciones: textos.map(x => ({ titulo: x.s.titulo, md: x.texto })),
    pie: g?.aprobado ? `Aprobado por ${g.aprobado.nombre} el ${g.aprobado.fecha}.` : 'Borrador sin aprobar.',
  };
}

function Seccion({ d, s, texto, propio, revisada, editable }: { d: Documento; s: Documento['secciones'][number]; texto: string; propio: boolean; revisada: boolean; editable: boolean }) {
  const [editando, setEditando] = useState(false);
  const pendiente = conPendientes(texto);
  return (
    <li className={cn('flex flex-col gap-2 rounded-lg border bg-white p-2.5', revisada ? 'border-emerald-300' : pendiente ? 'border-amber-300' : 'border-slate-200')}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-semibold text-slate-900">{s.titulo}</h4>
          {s.ayuda && <p className="text-[11px] text-slate-500">{s.ayuda}</p>}
        </div>
        <span className="flex items-center gap-1.5">
          {pendiente && <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 text-[10px] font-bold uppercase text-amber-900">Por completar</span>}
          {propio && <span className="rounded-full border border-sky-300 bg-sky-50 px-1.5 text-[10px] font-bold uppercase text-sky-800">{revisada ? 'Texto fijado' : 'Editado'}</span>}
          <Chip estado={revisada ? 'hecho' : 'pendiente'}>{revisada ? 'Revisada' : 'Sin revisar'}</Chip>
        </span>
      </div>
      {editando && editable && !revisada
        ? <Area etiqueta="Texto de la sección" valor={texto} filas={Math.min(18, Math.max(5, texto.split('\n').length + 1))} max={12000} alCambiar={v => editarSeccion(d, s.id, x => ({ ...x, texto: v, revisada: false }))}
            ayuda="Líneas en blanco separan párrafos. «- » al principio es una viñeta; «| a | b |» una tabla; **negrita**. Escribe sobre el borrador o bórralo y redáctalo." />
        : <Texto md={texto} className="rounded-md bg-slate-50 p-2" />}
      {editable && (
        <div className="flex flex-wrap items-center gap-1.5">
          {!revisada && <Button variant="outline" onClick={() => setEditando(v => !v)} className="gap-1 px-2 py-0.5 text-[11px] normal-case tracking-normal"><Pencil className="h-3 w-3" />{editando ? 'Dejar de editar' : 'Editar el texto'}</Button>}
          {!revisada && propio && <Button variant="outline" onClick={() => editarSeccion(d, s.id, () => ({}))} className="gap-1 px-2 py-0.5 text-[11px] normal-case tracking-normal"><RotateCcw className="h-3 w-3" />Volver al borrador automático</Button>}
          {!revisada
            ? <Button variant="primary" disabled={pendiente} title={pendiente ? 'Completa lo que está «por completar» para poder marcarla' : undefined}
                onClick={() => { editarSeccion(d, s.id, x => ({ ...x, texto, revisada: true })); setEditando(false); }} className="gap-1 px-2.5 py-0.5 text-[11px] normal-case tracking-normal"><Check className="h-3 w-3" />La he leído y está bien</Button>
            : <Button variant="outline" onClick={() => editarSeccion(d, s.id, x => ({ ...x, revisada: false }))} className="gap-1 px-2 py-0.5 text-[11px] normal-case tracking-normal"><RotateCcw className="h-3 w-3" />Reabrir esta sección</Button>}
          {pendiente && <span className="text-[11px] text-amber-800">Rellena los datos que faltan (datos del fabricante, ensayos…) o escríbelos aquí a mano.</span>}
        </div>
      )}
    </li>
  );
}

export function EditorDocumento({ d, g, st, ficha, editable, ir }: { d: Documento; g: DocGuardado | undefined; st: Estados; ficha: FichaHomologacion; editable: boolean; ir: Ir }) {
  const textos = useMemo(() => textosDeDocumento(d, g, st, ficha), [d, g, st, ficha]);
  const [firmante, setFirmante] = useState(st.fab.responsable);
  const rev = textos.filter(t => t.revisada).length;
  const pendientes = textos.filter(t => conPendientes(t.texto)).length;
  const estado = estadoDoc(g, d);
  const puedeAprobar = rev === textos.length && pendientes === 0 && !g?.aprobado;
  const obligaciones = obligacionesDeDoc(d.id);
  const pagina = () => paginaDocumento(d, textos, st, g);
  const html = useMemo(() => paginaHtml(pagina(), false), [d, textos, st.fab, g?.aprobado]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-slate-800"><span className="font-semibold">Para qué es:</span> {d.para}</p>
      <p className="text-xs text-slate-600"><span className="font-semibold">Norma:</span> {d.norma}</p>
      {obligaciones.length > 0 && <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600"><span className="font-semibold">Prueba:</span>{obligaciones.map(o => <Button key={o.id} variant="outline" onClick={() => ir('matriz', o.id)} title={o.exige} className="gap-1 px-1.5 py-0.5 text-[11px] normal-case tracking-normal"><Peso peso={o.peso} />{o.id} {o.titulo}</Button>)}</p>}
      <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{AVISO_DOCUMENTO}</p>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600">
        <span className="font-semibold">Secciones revisadas</span>
        <Barra pct={Math.round((rev / textos.length) * 100)} className="w-32" etiqueta="Secciones revisadas" />
        <span className="font-mono">{rev}/{textos.length}</span>
        {pendientes > 0 && <span className="text-amber-800">{pendientes} con datos «por completar»</span>}
        <Chip estado={estado} />
        {g?.aprobado && <span className="flex items-center gap-1 text-emerald-800"><Lock className="h-3.5 w-3.5" />Aprobado por {g.aprobado.nombre}, {fechaCorta(g.aprobado.fecha)}</span>}
      </div>

      <ul className="flex flex-col gap-2">
        {textos.map(t => <Seccion key={t.s.id} d={d} s={t.s} texto={t.texto} propio={t.propio} revisada={t.revisada} editable={editable && !g?.aprobado} />)}
      </ul>

      {editable && (
        <section className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5" aria-label="Aprobación">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Aprobación del documento</h4>
          {g?.aprobado ? (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-emerald-900"><Lock className="h-4 w-4" />Aprobado. Para cambiar algo, reabre la aprobación.
              <Button variant="outline" onClick={() => editar(d, v => { const { aprobado: _a, ...resto } = v; return resto; })} className="gap-1 px-2 py-0.5 text-xs normal-case tracking-normal"><RotateCcw className="h-3 w-3" />Reabrir</Button></div>
          ) : (
            <>
              <p className="text-xs text-slate-600">{puedeAprobar ? 'Todas las secciones están revisadas y no queda nada por completar.' : `Para aprobar hace falta: ${[rev < textos.length && `revisar las ${textos.length - rev} secciones que faltan`, pendientes > 0 && `completar las ${pendientes} con datos por completar`].filter(Boolean).join(' y ')}.`}</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[14rem] flex-1 flex-col gap-0.5 text-xs font-semibold text-slate-700">Firma: nombre de quien aprueba
                  <input value={firmante} maxLength={120} onChange={ev => setFirmante(ev.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] font-normal text-slate-900" /></label>
                <Button variant="primary" disabled={!puedeAprobar || !firmante.trim()} onClick={() => editar(d, v => ({ ...v, aprobado: { nombre: firmante.trim(), fecha: hoyIso() } }))} className="gap-1.5 px-3 py-1.5 text-xs normal-case tracking-normal"><FileSignature className="h-3.5 w-3.5" />Aprobar el documento</Button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="flex flex-col gap-1.5" aria-label="Documento firmado">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Copia firmada y archivos del documento</h4>
        <Adjuntos adjuntos={g?.adjuntos ?? []} alCambiar={l => editar(d, v => ({ ...v, adjuntos: l }))} pieza={`Documento ${d.codigo} ${d.titulo}`} soloLectura={!editable} etiqueta="Adjuntar la copia firmada o un anexo" />
        <p className="text-[11px] text-slate-500">Descarga el documento, fírmalo (en papel o con certificado digital), escanéalo y adjúntalo aquí. El expediente se conserva diez años.</p>
      </section>

      <section className="flex flex-col gap-2" aria-label="Vista previa">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">El documento completo</h4>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => descargarHtml(`${d.codigo}-${d.titulo}`, paginaHtml(pagina(), true))} className="gap-1.5 px-2.5 py-1 text-xs normal-case tracking-normal"><Download className="h-3.5 w-3.5" />Descargar</Button>
          <Button variant="outline" onClick={() => abrirHtml(paginaHtml(pagina(), true))} className="gap-1.5 px-2.5 py-1 text-xs normal-case tracking-normal"><Printer className="h-3.5 w-3.5" />Abrir para imprimir o guardar en PDF</Button>
        </div>
        <iframe title={`Vista previa de ${d.codigo}`} sandbox="" srcDoc={html} className="h-[30rem] w-full rounded-lg border border-slate-200 bg-white" />
      </section>
    </div>
  );
}
