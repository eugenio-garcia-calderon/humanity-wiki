import type { ReactNode } from 'react';
import NotaCirculo from './NotaCirculo';

// ============================================================================
// EL ESLABÓN DE LA BARRA (2026-10-26, Eugenio)
// ============================================================================
// «España y Movilidad unidas, como un eslabón de una cadena, para que se sepa que
// hablamos de la movilidad en España; con la misma letra; y la nota arriba, al
// lado.» Una pastilla con sus piezas: el territorio, la unión, el sistema (y lo
// que cuelga de él) y la nota.

// Segunda vuelta (2026-10-26, Eugenio: «quita el icono del eslabón y que el sistema se lea sin cortarse»):
// la pastilla es la de la barra (`CabeceraSitio`, con el botón de vista delante); aquí solo van las piezas.
// `circulo`: el de la vista Círculo, que manda sobre el del filtro de la portada (ese se esconde mientras está este).
export function Eslabon({ children, circulo }: { children: ReactNode; circulo?: boolean }) {
  return (
    <div data-eslabon data-eslabon-circulo={circulo || undefined} className="flex min-w-0 max-w-full items-center gap-0.5">
      {circulo && <style>{'[data-ranura-ruta]:has([data-eslabon-circulo]) > [data-eslabon]:not([data-eslabon-circulo]) { display: none; }'}</style>}
      {children}
    </div>
  );
}

/** Entre el territorio y el sistema: una raya fina (sin icono). */
export function Union() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />;
}

/** La nota al final del eslabón: en su círculo blanco con el aro de su color (2026-10-28, `NotaCirculo`). */
export function NotaEslabon({ nota, titulo }: { nota: number; titulo?: string }) {
  return <span data-nota-barra data-calificacion className="ml-1 inline-flex"><NotaCirculo nota={nota} tam="barra" titulo={titulo} /></span>;
}
