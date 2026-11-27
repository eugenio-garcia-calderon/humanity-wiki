import type { ReactNode } from 'react';
import { HERRAMIENTAS, areaDeIcono } from './herramientas';
import { IconoArea } from './visuales/iconosAreas';

// The small picture of a project in «Nuestra historia» (HistoriaSitio), 2026-11-27. Eugenio: «en 2026 aparecen
// un montón de proyectos, pero hay algunos que no tienen bien puesto el icono: está en blanco o es un icono
// antiguo. La ilustración, me refiero.» The 2026 tools had no photo of their own (blank) or an old uploaded logo.
//
// Tried first: the tool's Diseño 1 card illustration, shrunk into the chip. At 60×28 px it is a smudge of tiny text
// (rendered and looked at), so no. Now: a tool (anything with a Diseño 1 card) shows the duotone icon of its area,
// the same drawings as the area menu; a community keeps its own photo (`foto`, what HistoriaSitio passes); and
// anything else without a photo also gets its area's icon instead of a blank circle.
// Loaded lazily with the rest of Diseño 1, so the timeline keeps its old look for the instant before this arrives.

export default function MiniaturaHistoria({ fila, areas, foto }: { fila?: string; areas: string[]; foto: ReactNode }) {
  const herramienta = !!(fila && HERRAMIENTAS[fila]);
  if (!herramienta && foto) return <>{foto}</>;
  const texto = areas.join(' ');
  return (
    <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full sm:h-7 sm:w-7">
      <IconoArea area={areaDeIcono(texto, texto)} className="h-6 w-6 sm:h-7 sm:w-7" />
    </span>
  );
}
