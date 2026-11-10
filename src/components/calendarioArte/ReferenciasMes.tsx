// ============================================================================
// LA CARPETITA «REFERENCIAS» DE CADA MES (2026-11-10, Eugenio)
// ============================================================================
// «Permite que cualquier persona con el link pueda agregar referencias en cada
// mes para poder tener ilustraciones de referencia guardadas en una carpetita
// que se llame referencias. Con un más, donde si se le pincha, se genera el
// cuadro de diálogo que ya hemos utilizado previamente, donde puedes
// simplemente darle al control V y se pega, o arrastrar y que se suelte ahí,
// o darle a buscar archivo.»
//
// It sits under each month's sheet, outside the sheet itself, so it never
// prints. It is the same «Referencias» drawer as the month's folder
// (`VistaCarpetas`), only reachable without leaving the calendar: what is
// added here appears there, and the other way round.
//
// The «+» opens `SoltarImagen`, the paste / drag / file dialog the rest of the
// platform already uses (covers, icons, product photos). The picture goes in
// through the calendar's own upload door (no account) and is appended on the
// server (`POST …/referencias`), never by rewriting the whole list, so two
// people adding at once both keep theirs.
import { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '../ui/core';
import SoltarImagen from '../ui/SoltarImagen';
import type { Referencia } from '../../data/calendarioArteTipos';
import { ImagenGrande } from './VistaCarpetas';

interface Props {
  /** Nombre del mes, para el título del diálogo («Añadir una referencia a junio»). */
  nombreMes: string;
  /** Solo las de tipo referencia (sin tipo = referencia, como las de antes). */
  referencias: Referencia[];
  /** Sube y añade la imagen. Devuelve un mensaje si no ha ido bien. */
  alAnadir: (archivo: File) => Promise<string | void>;
  alAbrirCarpeta: () => void;
}

export function ReferenciasMes({ nombreMes, referencias, alAnadir, alAbrirCarpeta }: Props) {
  const [dialogo, setDialogo] = useState(false);
  const [grande, setGrande] = useState<string | null>(null);
  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-2 py-1.5">
      <Button variant="ghost" onClick={alAbrirCarpeta} title="Abrir la carpeta del mes"
        className="shrink-0 gap-1.5 px-2 py-1 normal-case tracking-normal text-xs font-semibold text-stone-600">
        <FolderOpen className="h-4 w-4 text-amber-500" />
        Referencias
        <span className="font-normal text-stone-400">({referencias.length})</span>
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
        {/* The «+» goes first and the newest picture right after it: with many
            references the strip scrolls, and on a phone a «+» at the far end
            of it would be off screen. */}
        <Button variant="ghost" onClick={() => setDialogo(true)} aria-label={`Añadir una referencia a ${nombreMes}`} title="Añadir una referencia"
          className="h-12 w-12 shrink-0 rounded-lg border-2 border-dashed border-stone-300 p-0 text-stone-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600">
          <Plus className="h-5 w-5" />
        </Button>
        {[...referencias].reverse().map(r => (
          <Button key={r.url} variant="ghost" onClick={() => setGrande(r.url)} title={r.nota || 'Ver en grande'}
            className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 p-0 hover:opacity-90">
            <img src={r.url} alt={r.nota || `Referencia de ${nombreMes}`} loading="lazy" className="h-full w-full object-cover" />
          </Button>
        ))}
        {referencias.length === 0 && (
          <span className="text-xs text-stone-400">Añade imágenes que inspiren la ilustración de {nombreMes}.</span>
        )}
      </div>
      {dialogo && (
        <SoltarImagen titulo={`Añadir una referencia a ${nombreMes}`} onArchivo={alAnadir} onCerrar={() => setDialogo(false)} />
      )}
      {grande && <ImagenGrande url={grande} alCerrar={() => setGrande(null)} />}
    </div>
  );
}
