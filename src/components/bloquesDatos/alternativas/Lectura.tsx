import { Trophy } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { useFicha } from '../ficha/useFicha';
import { vistaAlternativas } from '../ficha/vistas';
import { Cargando, Seccion, SinFila, useEnlaceFila } from '../ficha/comunes';
import { NOTA_POR_DATOS, NOTA_ORDEN } from '../ficha/vistas';

// THE BEST IN EACH CRITERION (plan §3.5). One line per criterion: who wins,
// with what value, and where this product stands. The ranking is
// `vistaAlternativas`, which can never rank by commission (`modelo.ts`,
// NUNCA_ORDENA). The block says that too, in one line: a reader who wonders
// whether the order is paid for should find the answer next to the order.

export function VistaAlternativas({ datos, paginaId, enEditor }: PropsLectura & { enEditor?: boolean }) {
  const { ficha, cargando } = useFicha(paginaId);
  const enlace = useEnlaceFila();
  if (cargando) return <Cargando />;
  if (!ficha) return enEditor ? <SinFila que="Este bloque compara la fila de la página con las demás de su base de datos." /> : null;
  const v = vistaAlternativas(ficha, datos);
  if (!v) return enEditor ? <p className="text-sm text-slate-400">Hacen falta al menos dos filas con datos comparables.</p> : null;
  return (
    <Seccion titulo={v.titulo}>
      {v.ambito ? <p className="mb-1.5 text-sm text-slate-500">{v.ambito}</p> : null}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {v.criterios.map(c => {
          const href = c.esEsta ? null : enlace(c.ganador.paginaId);
          return (
            <li key={c.columnaId} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2 text-base">
              <span className="font-medium text-slate-600">
                {c.criterio}
                {c.base ? <span className="block text-sm font-normal text-slate-500">{c.base === 'votos' ? 'Según los votos de la comunidad' : `Según los datos: ${c.segun}`}</span> : null}
              </span>
              <span className="text-right">
                {c.esEsta ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><Trophy className="h-3.5 w-3.5" /> Este producto{c.empates ? ` (y ${c.empates} más)` : ''}</span>
                ) : href ? (
                  <a href={href} className="font-bold text-sky-700 hover:underline">{c.ganador.nombre}</a>
                ) : (
                  <span className="font-bold text-slate-800">{c.ganador.nombre}</span>
                )}
                {!c.esEsta && c.empates ? <span className="text-slate-500"> y {c.empates} más</span> : null}
                <span className="ml-1.5 text-slate-500">{c.ganador.valor}</span>
                {!c.esEsta && c.puesto ? <span className="block text-sm text-slate-500">Este producto: {c.puesto.n}.º de {c.puesto.de}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-sm text-slate-500">{v.porDatos ? NOTA_POR_DATOS : NOTA_ORDEN}</p>
    </Seccion>
  );
}

export default function Lectura(p: PropsLectura) {
  return <VistaAlternativas {...p} />;
}
