import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Layers, X } from 'lucide-react';
import { OBJETIVOS } from '../../utils/objetivos';
import { OBJECTIVE_ID_BY_KEY } from '../../utils/objectiveIds';
import { cn } from '../../utils/cn';

/*
 * EXPLORAR — LOS CATORCE OBJETIVOS, EN CASCADA (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Eugenio: «será exactamente idéntico… al menú de los mapas donde tenemos los
 * catorce objetivos en un menú izquierdo, modo cascada, y ése será el menú que
 * se despliegue cuando le demos a explorar».
 *
 * ES EL MISMO MENÚ, CON LOS MISMOS DATOS Y EL MISMO ASPECTO: objetivo →
 * indicador → marcador, el activo en oscuro, el indicador activo en verde. Se
 * reconstruye aquí en vez de sacarse de `Map.tsx` por una razón concreta: esa
 * página tiene 900 líneas, es de otra área y su menú está atado a su estado de
 * mapa —encuadre, capa activa, territorio—. Arrancarlo de ahí sería tocar el
 * trabajo de otro para que este panel exista.
 *
 * LO QUE SÍ SE COMPARTE ES LA FUENTE: los catorce salen de `utils/objetivos.ts`
 * y los identificadores de `utils/objectiveIds.ts`, que son los mismos ficheros
 * que usa el mapa. Si mañana hay quince, los hay en los dos sitios a la vez.
 * Copiar la lista aquí habría sido la tercera copia, y la primera en separarse.
 *
 * INDICADORES Y MARCADORES SE PIDEN AL ABRIR, no al arrancar la aplicación: son
 * dos peticiones que sólo interesan a quien pulsa «Explorar».
 */

/** Ancho del panel: la mitad en un móvil, un tercio en un ordenador. */
export const ANCHO_EXPLORAR = 'w-1/2 sm:w-1/3';

export default function PanelExplorar({ onCerrar }: { onCerrar: () => void }) {
  const navegar = useNavigate();
  const [indicadores, setIndicadores] = useState<any[] | null>(null);
  const [marcadores, setMarcadores] = useState<any[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [objAbierto, setObjAbierto] = useState<string | null>(null);
  const [indAbierto, setIndAbierto] = useState<string | null>(null);

  const pedir = () => {
    setFallo(false);
    Promise.all([
      fetch('/api/data/indicators').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/data/markers').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([i, m]) => { setIndicadores(Array.isArray(i) ? i : []); setMarcadores(Array.isArray(m) ? m : []); })
      // Mismo criterio que en los paneles de la derecha: un fallo NUNCA se pinta
      // como un vacío. «No hay indicadores» y «no he podido preguntarlo» son
      // dos frases distintas porque son dos cosas distintas.
      .catch(() => setFallo(true));
  };
  useEffect(pedir, []);

  const porObjetivo = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const i of indicadores || []) {
      const k = String(i.objective_id || '');
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(i);
    }
    return m;
  }, [indicadores]);

  return (
    <aside
      aria-label="Explorar"
      className={cn('flex h-full shrink-0 flex-col border-r border-slate-200 bg-white', ANCHO_EXPLORAR)}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Explorar</h2>
        <button onClick={onCerrar} title="Cerrar" aria-label="Cerrar"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {fallo && (
          <div className="px-4 py-4">
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

        {OBJETIVOS.map(obj => {
          const Icono = obj.icono;
          const id = OBJECTIVE_ID_BY_KEY[obj.titulo.toLowerCase() as keyof typeof OBJECTIVE_ID_BY_KEY] ?? obj.id;
          const activo = objAbierto === obj.id;
          const suyos = porObjetivo.get(String(id)) || porObjetivo.get(String(obj.id)) || [];

          return (
            <div key={obj.id} className="border-b border-slate-100">
              <button
                onClick={() => { setObjAbierto(a => (a === obj.id ? null : obj.id)); setIndAbierto(null); }}
                aria-expanded={activo}
                className={cn('flex w-full items-center gap-2 px-4 py-3 text-left transition-colors',
                  activo ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')}
              >
                <Icono className={cn('h-4 w-4 shrink-0', activo ? 'text-emerald-400' : 'text-emerald-600')} />
                <span className={cn('flex-1 font-semibold', activo ? 'text-base' : 'text-sm')}>{obj.titulo}</span>
                {suyos.length > 0 && (
                  <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform',
                    activo ? 'rotate-180 text-white' : 'text-slate-400')} />
                )}
              </button>

              {activo && (
                <div className="bg-slate-50">
                  {/* Un objetivo sin indicadores lo dice, en vez de abrirse
                      vacío y dejar pensando si ha fallado algo. */}
                  {suyos.length === 0 && !fallo && (
                    <p className="px-6 py-2 text-[11px] italic text-slate-400">
                      {indicadores === null ? 'Cargando…' : 'Sin indicadores todavía'}
                    </p>
                  )}
                  {suyos.map(ind => {
                    const indActivo = indAbierto === ind.id;
                    const suyas = (marcadores || []).filter(m => m.indicator_id === ind.id);
                    return (
                      <div key={ind.id}>
                        <button
                          onClick={() => setIndAbierto(a => (a === ind.id ? null : ind.id))}
                          aria-expanded={indActivo}
                          className={cn('flex w-full items-center gap-2 py-2 pl-6 pr-4 text-left text-sm font-semibold transition-colors',
                            indActivo ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
                        >
                          <Layers className={cn('h-3.5 w-3.5 shrink-0', indActivo ? 'text-white' : 'text-emerald-600')} />
                          <span className="flex-1 truncate">{ind.name}</span>
                          {suyas.length > 0 && (
                            <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', indActivo && 'rotate-180')} />
                          )}
                        </button>

                        {indActivo && suyas.length > 0 && (
                          <div className="bg-slate-100">
                            {suyas.map(m => (
                              <button
                                key={m.id}
                                onClick={() => { navegar(`/indicadores/${ind.id}`); onCerrar(); }}
                                className="flex w-full items-center gap-2 py-1.5 pl-10 pr-4 text-left text-[13px] text-slate-600 transition-colors hover:bg-slate-200"
                              >
                                <Layers className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="flex-1 truncate">{m.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
