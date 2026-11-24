// The «Homologación» page (2026-11-24, Eugenio: «cuando se pinche en homologación … se abre la homologación en pantalla
// completa»; later that day: «de momento nos vamos a referir solo a la homologación de ciclo de pedal con pedaleo asistido.
// El resto de homologaciones de L1 y L6 … que estén ahí en un desplegable lateral»). It takes the whole page (the garage and
// the 3D view are hidden: homologation needs none of it) and holds ONE thing: the pedal cycle's file (`epac/PaginaEpac.tsx`:
// matrix, tests, documents, files, reference). The L1e-A, the heavy L6e/L7e and the ways to approve are a different
// category each and live in a drawer on the right (`OtrasHomologaciones.tsx`), unchanged. Text as data in `guias.ts`.
import { useCallback, useState } from 'react';
import { Layers, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/core';
import type { Modelo, Parametros, Resultados } from '../geometria';
import { FUENTES } from './normas';
import type { CdConocido } from './ficha';
import { useHomologacion } from './PanelHomologacion';
import { PaginaEpac } from './epac/PaginaEpac';
import { OtrasHomologaciones } from './OtrasHomologaciones';

/** `puedeDecidir`: the owner (or an admin) of the Aeromóvil: the only one who fills in the pedal cycle's file. */
export function PaginaHomologacion({ P, modelo, res, cd, nombre, puedeDecidir }: { P: Parametros; modelo: Modelo; res: Resultados; cd: CdConocido | null; nombre: string; puedeDecidir: boolean }) {
  const { ficha, auto } = useHomologacion(P, modelo, res, cd, nombre);
  const [otras, setOtras] = useState(false);
  const cerrar = useCallback(() => setOtras(false), []);
  return (
    <section aria-label="Homologación" className="mx-auto flex max-w-6xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 basis-72">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-700" />Homologación · Ciclo de pedales con pedaleo asistido</h2>
          <p className="text-[13px] text-slate-600">{ficha.vehiculo}. Todo lo que hay que tener hecho antes de vender la primera unidad y de que circule: cada obligación legal con su prueba, los ensayos, los documentos y su porcentaje de avance.</p>
        </div>
        <Button variant="outline" onClick={() => setOtras(true)} aria-haspopup="dialog" className="gap-1.5 px-3 py-1.5 text-xs normal-case tracking-normal"><Layers className="h-3.5 w-3.5" />Otras homologaciones (L1e-A, L6e, L7e)</Button>
      </header>

      <PaginaEpac ficha={ficha} puedeDecidir={puedeDecidir} />

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">De dónde salen las cifras del diseño</summary>
        <ul className="mt-1 list-disc pl-4">{ficha.notas.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </details>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">Textos legales</summary>
        <ul className="mt-1 flex flex-col gap-0.5">{Object.entries(FUENTES).map(([id, f]) => (
          <li key={id}><a className="text-teal-700 underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>{!f.leido && <span className="text-slate-500"> (citado, no releído: por confirmar)</span>}</li>
        ))}</ul>
      </details>

      <OtrasHomologaciones ficha={ficha} auto={auto} abierto={otras} cerrar={cerrar} />
    </section>
  );
}
