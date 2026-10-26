import type { ReactNode } from 'react';
import { colorDeNota, textoNota, textoSobre } from '../../utils/nota';

// ============================================================================
// EL ESLABÓN DE LA BARRA (2026-10-26, Eugenio)
// ============================================================================
// «España y Movilidad unidas, como un eslabón de una cadena, para que se sepa que
// hablamos de la movilidad en España; con la misma letra; y la nota arriba, al
// lado.» Una pastilla con sus piezas: el territorio, la unión, el sistema (y lo
// que cuelga de él) y la nota.

// Segunda vuelta (2026-10-26, Eugenio: «quita el icono del eslabón y que el sistema se lea sin cortarse»):
// la pastilla es la de la barra (`CabeceraSitio`, con el botón de vista delante); aquí solo van las piezas.
export function Eslabon({ children }: { children: ReactNode }) {
  return <div data-eslabon className="flex min-w-0 max-w-full items-center gap-0.5">{children}</div>;
}

/** Entre el territorio y el sistema: una raya fina (sin icono). */
export function Union() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />;
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
