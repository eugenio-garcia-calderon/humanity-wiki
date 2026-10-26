import type { ReactNode } from 'react';
import { Link2 } from 'lucide-react';
import { colorDeNota, textoNota, textoSobre } from '../../utils/nota';

// ============================================================================
// EL ESLABÓN DE LA BARRA (2026-10-26, Eugenio)
// ============================================================================
// «España y Movilidad unidas, como un eslabón de una cadena, para que se sepa que
// hablamos de la movilidad en España; con la misma letra; y la nota arriba, al
// lado.» Una pastilla con sus piezas: el territorio, la unión, el sistema (y lo
// que cuelga de él) y la nota.

export function Eslabon({ children }: { children: ReactNode }) {
  return <div data-eslabon className="flex min-w-0 max-w-full items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-sm">{children}</div>;
}

/** La unión entre dos piezas: un eslabón de cadena. */
export function Union() {
  return <Link2 className="h-4 w-4 shrink-0 -rotate-45 text-slate-400" aria-label="de" />;
}

/** La nota, con su color, al final del eslabón. */
export function NotaEslabon({ nota, titulo }: { nota: number; titulo?: string }) {
  const c = colorDeNota(nota);
  return (
    <span data-nota-barra aria-label={`${titulo ? `${titulo}: ` : ''}nota ${textoNota(nota)} sobre 10`}
      className="ml-1 inline-flex h-9 shrink-0 items-baseline gap-0.5 rounded-full px-3 pt-[7px] text-base font-black tabular-nums leading-none"
      style={{ backgroundColor: c, color: textoSobre(c) }}>
      {textoNota(nota)}<span className="text-[10px] font-bold opacity-75">/10</span>
    </span>
  );
}
