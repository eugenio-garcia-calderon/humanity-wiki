import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers, X } from 'lucide-react';
import { OBJETIVOS } from '../../utils/objetivos';
import { OBJECTIVE_ID_BY_KEY } from '../../utils/objectiveIds';
import type { Herramienta } from './Rail';
import { cn } from '../../utils/cn';

/*
 * EXPLORAR — EL ESPEJO DEL MENÚ DE LA DERECHA (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Eugenio, mirando la primera versión: «mejora el menú de la izquierda, porque
 * claramente algo está fallando… haz que tenga también ese fondo negro, y que
 * sea un menú que se abre de lado en vez de en cascada hacia abajo, y así
 * tenemos como en un espejo ambos menús igual de diseñados».
 *
 * QUÉ FALLABA. Lo hice como el menú del mapa: una columna clara donde los
 * catorce objetivos se desplegaban HACIA ABAJO, empujándose unos a otros. Con
 * indicadores y marcadores dentro, elegir el cuarto objetivo mandaba el resto
 * fuera de la pantalla, y a la derecha había un menú que hacía justo lo
 * contrario. Dos mitades de la misma aplicación con dos gramáticas distintas.
 *
 * AHORA SON LA MISMA PIEZA: un raíl oscuro de catorce entradas —el mismo
 * componente `Rail` que el de la derecha, con otra lista— y, al lado, un panel
 * claro donde vive lo que cuelga del objetivo elegido. Lo de dentro sí baja en
 * cascada, pero DENTRO del panel: los catorce de fuera nunca se mueven, así que
 * siempre sabes dónde estabas.
 *
 * Este fichero es sólo el panel claro. El raíl lo monta `Layout` con `Rail`.
 */

/** Los catorce, en la forma que entiende el raíl. Salen de `utils/objetivos.ts`,
 *  el mismo fichero que lee el mapa: si mañana hay quince, los hay en los dos. */
export const OBJETIVOS_RAIL: Herramienta[] = OBJETIVOS.map(o => ({
  clave: o.id,
  nombre: o.titulo,
  icono: o.icono,
  ruta: `/objetivos/${o.id}`,
  conPanel: true,
}));

export default function PanelExplorar({ objetivoId, onCerrar }: {
  objetivoId: string;
  onCerrar: () => void;
}) {
  const navegar = useNavigate();
  const [indicadores, setIndicadores] = useState<any[] | null>(null);
  const [marcadores, setMarcadores] = useState<any[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [indAbierto, setIndAbierto] = useState<string | null>(null);

  const pedir = () => {
    setFallo(false);
    Promise.all([
      fetch('/api/data/indicators').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/data/markers').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([i, m]) => { setIndicadores(Array.isArray(i) ? i : []); setMarcadores(Array.isArray(m) ? m : []); })
      // El mismo criterio que en los paneles de la derecha: un fallo NUNCA se
      // pinta como un vacío. «No hay indicadores» y «no he podido preguntarlo»
      // son dos frases distintas porque son dos cosas distintas.
      .catch(() => setFallo(true));
  };
  useEffect(pedir, []);
  useEffect(() => setIndAbierto(null), [objetivoId]);

  const objetivo = OBJETIVOS.find(o => o.id === objetivoId);
  const suyos = useMemo(() => {
    if (!objetivo) return [];
    const alterno = OBJECTIVE_ID_BY_KEY[objetivo.titulo.toLowerCase() as keyof typeof OBJECTIVE_ID_BY_KEY];
    return (indicadores || []).filter(i =>
      String(i.objective_id) === String(objetivo.id) || (alterno && String(i.objective_id) === String(alterno)));
  }, [indicadores, objetivo]);

  const Icono = objetivo?.icono;

  return (
    <aside
      aria-label="Explorar"
      className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
          {Icono && <Icono className="h-4 w-4 text-emerald-600" />} {objetivo?.titulo ?? 'Explorar'}
        </h2>
        <button onClick={onCerrar} title="Cerrar" aria-label="Cerrar"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={() => { navegar(`/objetivos/${objetivoId}`); onCerrar(); }}
        className="mx-3 mb-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-left text-[13px] font-bold text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
      >
        Ver la página del objetivo →
      </button>

      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {fallo && (
          <div className="px-2 py-3">
            <p className="text-xs leading-relaxed text-amber-700">
              No hemos podido cargar los indicadores. No es que no haya: es que no
              hemos podido preguntarlo.
            </p>
            <button onClick={pedir}
              className="mt-2 rounded-lg border border-amber-300 px-2.5 py-1.5 text-[12px] font-bold text-amber-800 hover:bg-amber-50">
              Volver a intentarlo
            </button>
          </div>
        )}
        {!fallo && indicadores === null && (
          <p className="px-3 py-6 text-center text-xs text-slate-400">Cargando…</p>
        )}
        {!fallo && indicadores !== null && suyos.length === 0 && (
          <p className="px-3 py-6 text-center text-xs leading-relaxed text-slate-400">
            Este objetivo todavía no tiene indicadores.
          </p>
        )}

        {suyos.map(ind => {
          const abierto = indAbierto === ind.id;
          const suyas = (marcadores || []).filter(m => m.indicator_id === ind.id);
          return (
            <div key={ind.id}>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setIndAbierto(a => (a === ind.id ? null : ind.id))}
                  aria-expanded={abierto}
                  aria-label={abierto ? `Plegar ${ind.name}` : `Desplegar ${ind.name}`}
                  className="grid h-7 w-6 shrink-0 place-items-center rounded text-slate-400 hover:text-slate-800"
                >
                  {suyas.length > 0 && <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-90')} />}
                </button>
                {/* El nombre NAVEGA y la flecha DESPLIEGA, igual que en el panel
                    de Proyectos. La misma forma en los dos lados del espejo. */}
                <button
                  onClick={() => { navegar(`/indicadores/${ind.id}`); onCerrar(); }}
                  className="min-w-0 flex-1 truncate rounded-lg px-1.5 py-1.5 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-100"
                >
                  {ind.name}
                </button>
              </div>

              {abierto && suyas.length > 0 && (
                <div className="pn-cascada ml-6 border-l border-slate-100 pl-2">
                  {suyas.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { navegar(`/indicadores/${ind.id}`); onCerrar(); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
