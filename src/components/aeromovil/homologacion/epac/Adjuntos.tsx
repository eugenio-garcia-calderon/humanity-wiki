// Attach, see and take out the files of one thing in the pedal cycle's file: a matrix slot, a test attempt, a document
// (2026-11-24, Eugenio: «el apartado de subir documento o adjuntar archivo y ver archivos… una gestión documental de todo
// lo necesario»). The upload is the Aeromóvil's (`proveedores/datos.ts` → `POST /api/aeromovil/adjuntos`: PDF, photos,
// Word, Excel, PowerPoint, CSV and text up to 10 MB). «Quitar» only takes the file out of THIS list: the evidence stays
// stored on the server (nothing of a legal file is deleted by accident).
import { useRef, useState } from 'react';
import { FileText, Image as Imagen, Paperclip, Upload, X } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import { esHeic, heicAJpg } from '../../../../utils/prepararImagen';
import { ACEPTA, subirAdjunto, tamano, type Adjunto } from '../../proveedores/datos';
import { fechaCorta } from './ui';

export function Adjuntos({ adjuntos, alCambiar, pieza, max = 8, soloLectura, etiqueta = 'Adjuntar archivo' }: { adjuntos: Adjunto[]; alCambiar: (l: Adjunto[]) => void; pieza: string; max?: number; soloLectura?: boolean; etiqueta?: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quitar, setQuitar] = useState<number | null>(null);

  const subir = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setError(null);
    const errores: string[] = [];
    let actual = adjuntos;
    for (const f of Array.from(lista)) {
      if (actual.length >= max) { errores.push(`Máximo ${max} archivos aquí.`); break; }
      try {
        setSubiendo(f.name);
        const listo = esHeic(f) ? await heicAJpg(f) : f;
        const a = await subirAdjunto(listo, pieza.slice(0, 150));
        actual = [...actual, a]; alCambiar(actual);
      } catch (e: any) { errores.push(e?.message || `No se ha podido subir «${f.name}».`); }
    }
    setSubiendo(null);
    if (errores.length) setError(errores.join(' '));
    if (entrada.current) entrada.current.value = '';
  };

  return (
    <div className="flex flex-col gap-1.5">
      {adjuntos.length > 0 && (
        <ul className="flex flex-col gap-1">
          {adjuntos.map(a => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
              {a.tipo.startsWith('image/') ? <Imagen className="h-3.5 w-3.5 shrink-0 text-teal-700" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-teal-700" />}
              <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-teal-800 underline" title={`Abrir ${a.nombre}`}>{a.nombre}</a>
              <span className="whitespace-nowrap text-slate-500">{tamano(a.bytes)} · {fechaCorta(a.fecha)}</span>
              {!soloLectura && (quitar === a.id
                ? <span className="flex items-center gap-1">
                    <Button variant="outline" onClick={() => { alCambiar(adjuntos.filter(x => x.id !== a.id)); setQuitar(null); }} className="border-rose-300 px-1.5 py-0.5 text-[11px] normal-case tracking-normal text-rose-700">Quitar de la lista</Button>
                    <Button variant="ghost" onClick={() => setQuitar(null)} className="px-1.5 py-0.5 text-[11px] normal-case tracking-normal">No</Button>
                  </span>
                : <Button variant="ghost" onClick={() => setQuitar(a.id)} aria-label={`Quitar ${a.nombre} de la lista`} className="p-0.5 text-slate-400 hover:text-rose-600"><X className="h-3.5 w-3.5" /></Button>)}
            </li>
          ))}
        </ul>
      )}
      {quitar != null && <p className="text-[11px] text-slate-500">El archivo sigue guardado en el servidor; solo se quita de esta lista.</p>}
      {!soloLectura && (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={entrada} type="file" multiple accept={ACEPTA} className="hidden" onChange={e => void subir(e.target.files)} aria-label={`${etiqueta}: ${pieza}`} />
          <Button variant="outline" disabled={!!subiendo || adjuntos.length >= max} onClick={() => entrada.current?.click()}
            className={cn('gap-1.5 bg-white px-2 py-1 text-[11px] normal-case tracking-normal', subiendo && 'opacity-60')}>
            {subiendo ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <Paperclip className="h-3.5 w-3.5" />}{subiendo ? `Subiendo «${subiendo}»…` : etiqueta}
          </Button>
          <span className="text-[11px] text-slate-500">PDF, fotos, Word, Excel… hasta 10 MB · {adjuntos.length}/{max}</span>
        </div>
      )}
      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800">{error}</p>}
    </div>
  );
}
