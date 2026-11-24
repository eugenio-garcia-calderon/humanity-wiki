// Every file of the pedal cycle's file in one place (2026-11-24, Eugenio: «gestión documental de todo lo necesario»):
// what is attached to a matrix slot, to a test attempt or to a document, and a shelf for loose files (a datasheet, a
// supplier's certificate) that belong to no one yet. Each row says where it hangs and takes you there.
import { useMemo } from 'react';
import { ArrowRight, FileText, FolderOpen, Image as Imagen } from 'lucide-react';
import { Button } from '../../../ui/core';
import { DOCUMENTOS } from './documentos';
import { ENSAYOS } from './ensayos';
import { OBLIGACIONES } from './catalogo';
import { cambiar, leer } from './almacen';
import type { Estados } from './progreso';
import type { Adjunto } from './tipos';
import { Adjuntos } from './Adjuntos';
import { tamano } from '../../proveedores/datos';
import { fechaCorta, type Ir, type Seccion } from './ui';

export const CLAVE_BIBLIOTECA = 'biblioteca';
interface Biblioteca { adjuntos: Adjunto[] }

interface Fila { a: Adjunto; donde: string; seccion: Seccion; id?: string }

export function PanelArchivos({ st, editable, ir }: { st: Estados; editable: boolean; ir: Ir }) {
  const biblioteca = leer<Biblioteca>(CLAVE_BIBLIOTECA, { adjuntos: [] }).adjuntos;
  const filas = useMemo(() => {
    const out: Fila[] = [];
    for (const o of OBLIGACIONES) for (const h of o.huecos) for (const a of st.obligaciones[o.id]?.huecos[h.id]?.adjuntos ?? []) out.push({ a, donde: `Matriz · ${o.id} ${o.titulo} (${h.id})`, seccion: 'matriz', id: o.id });
    for (const e of ENSAYOS) (st.ensayos[e.id]?.intentos ?? []).forEach((i, k) => i.adjuntos.forEach(a => out.push({ a, donde: `Ensayo · ${e.codigo} ${e.titulo} (intento ${k + 1})`, seccion: 'ensayos', id: e.id })));
    for (const d of DOCUMENTOS) for (const a of st.docs[d.id]?.adjuntos ?? []) out.push({ a, donde: `Documento · ${d.codigo} ${d.titulo}`, seccion: 'documentos', id: d.id });
    return out.sort((x, y) => (y.a.fecha ?? '').localeCompare(x.a.fecha ?? ''));
  }, [st]);
  if (!editable) return <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-600">Los archivos del expediente solo los ve el dueño del Aeromóvil.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-[13px] text-teal-950">
        <p className="flex items-center gap-1.5 font-semibold"><FolderOpen className="h-4 w-4" />Todos los archivos del expediente, en un sitio.</p>
        <p className="mt-1">Cada archivo se adjunta donde corresponde (una obligación de la matriz, un ensayo, un documento) y aquí aparecen todos juntos, del más reciente al más antiguo. Abajo hay una estantería para los archivos sueltos. Quitar un archivo de una lista no lo borra del servidor.</p>
      </div>

      <section className="flex flex-col gap-1.5" aria-label="Archivos del expediente">
        <h3 className="flex items-baseline gap-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">Adjuntos del expediente<span className="text-xs font-normal text-slate-500">{filas.length}</span></h3>
        {!filas.length && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[13px] text-slate-600">Todavía no hay ningún archivo adjunto. Sube planos, cálculos, fotos de las pruebas e informes en la matriz y en los ensayos.</p>}
        <ul className="flex flex-col gap-1">
          {filas.map((f, k) => (
            <li key={`${f.a.id}${k}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
              {f.a.tipo.startsWith('image/') ? <Imagen className="h-4 w-4 shrink-0 text-teal-700" /> : <FileText className="h-4 w-4 shrink-0 text-teal-700" />}
              <a href={f.a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 basis-48 truncate font-medium text-teal-800 underline">{f.a.nombre}</a>
              <span className="min-w-0 basis-64 text-slate-600">{f.donde}</span>
              <span className="whitespace-nowrap text-slate-500">{tamano(f.a.bytes)} · {fechaCorta(f.a.fecha)}</span>
              <Button variant="ghost" onClick={() => ir(f.seccion, f.id)} aria-label={`Ir a ${f.donde}`} className="p-1 text-slate-400 hover:text-teal-700"><ArrowRight className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1.5" aria-label="Archivos sueltos">
        <h3 className="flex items-baseline gap-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-900">Estantería de archivos sueltos<span className="text-xs font-normal text-slate-500">fichas de proveedores, certificados, normas que compréis…</span></h3>
        <Adjuntos adjuntos={biblioteca} alCambiar={l => cambiar<Biblioteca>(CLAVE_BIBLIOTECA, { adjuntos: [] }, () => ({ adjuntos: l }))} pieza="Expediente EPAC · archivo suelto" max={40} etiqueta="Subir archivo suelto" />
      </section>
    </div>
  );
}

