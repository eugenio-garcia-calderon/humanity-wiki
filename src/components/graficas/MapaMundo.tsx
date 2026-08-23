import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { RAMPA_SECUENCIAL, SIN_DATO, CROMADO } from '../../utils/graficas/colores';
import { numero, type Unidad } from '../../utils/graficas/formato';
import { aIdDeMapa, nombreDePais, ALFA2_POR_ID } from '../../utils/graficas/paises';
import { colorDe, tramosPorCuantiles } from '../../utils/graficas/tramos';
import { useMedida } from './lienzo';

// ============================================================================
// EL MAPA DEL MUNDO (2026-08-23)
// ============================================================================
// La pieza que más se reconoce de Our World in Data y la que más cara sale:
// hacen falta las formas de los países, una proyección, una escala de color
// por tramos, una leyenda que se entienda y —lo que casi siempre falta— decir
// en voz alta qué filas NO se han podido pintar.
//
// LAS FORMAS SE BAJAN APARTE. `public/datos/paises-110m.json` son 108 KB de
// TopoJSON (Natural Earth vía world-atlas, licencia ISC) y se piden la primera
// vez que alguien abre un mapa, no al entrar en la plataforma. TopoJSON y no
// GeoJSON porque comparte las fronteras entre países vecinos: el mismo mundo
// en la cuarta parte de sitio.
//
// LA PROYECCIÓN ES NATURAL EARTH. Mercator, que es la que sale por defecto en
// casi todo, hace Groenlandia del tamaño de África. En un mapa donde el área
// de cada país es lo que se está mirando, eso no es un detalle estético.
//
// LO QUE NO SE PUEDE PINTAR SE DICE. Tener código ISO y tener forma en el mapa
// no es lo mismo (Kosovo tiene código y no tiene forma; los microestados no se
// dibujan a esta escala). Las filas que se quedan fuera se listan debajo del
// mapa. Un mapa al que le faltan doce países sin avisar es un dato incorrecto
// presentado como correcto.

interface Props {
  /** Entidad (como venga escrita) → valor. */
  valores: Map<string, number>;
  unidad?: Unidad;
  alto?: number;
  /** Qué instante se está viendo, para el título del globo de ayuda. */
  momento?: string | null;
}

type Formas = { rasgos: any[]; ids: Set<string> };

/** Las formas del mundo, pedidas UNA vez y compartidas por todos los mapas. */
let promesaFormas: Promise<Formas> | null = null;
function cargarFormas(): Promise<Formas> {
  if (!promesaFormas) {
    promesaFormas = fetch('/datos/paises-110m.json')
      .then(r => {
        if (!r.ok) throw new Error('No se han podido cargar las formas del mapa.');
        return r.json();
      })
      .then(topo => {
        const geo = feature(topo, topo.objects.countries);
        const rasgos = (geo as any).features as any[];
        return { rasgos, ids: new Set(rasgos.map(f => String(f.id))) };
      })
      .catch(e => { promesaFormas = null; throw e; });
  }
  return promesaFormas;
}

export default function MapaMundo({ valores, unidad, alto = 420, momento }: Props) {
  const [ref, medida] = useMedida<HTMLDivElement>();
  const [formas, setFormas] = useState<Formas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState<{ id: string; x: number; y: number } | null>(null);
  const caja = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let vivo = true;
    cargarFormas().then(f => { if (vivo) setFormas(f); }).catch(e => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, []);

  /** Del nombre que traen los datos al identificador de la forma. */
  const porId = useMemo(() => {
    const m = new Map<string, { v: number; entidad: string }>();
    for (const [entidad, v] of valores) {
      const id = aIdDeMapa(entidad);
      if (id) m.set(id, { v, entidad });
    }
    return m;
  }, [valores]);

  const fuera = useMemo(() => {
    if (!formas) return [];
    return [...valores.keys()].filter(e => {
      const id = aIdDeMapa(e);
      return !id || !formas.ids.has(id);
    });
  }, [valores, formas]);

  const tramos = useMemo(
    () => tramosPorCuantiles([...porId.values()].map(x => x.v), RAMPA_SECUENCIAL, 6),
    [porId],
  );

  const dibujo = useMemo(() => {
    if (!formas || medida.ancho < 10) return null;
    const proy = geoNaturalEarth1();
    // `fitSize` encaja el mundo entero en el hueco que haya, sea cual sea.
    proy.fitSize([medida.ancho, alto], { type: 'FeatureCollection', features: formas.rasgos } as any);
    const camino = geoPath(proy);
    return formas.rasgos.map(f => ({
      id: String(f.id),
      nombre: f.properties?.name || '',
      d: camino(f) || '',
      centro: camino.centroid(f),
    }));
  }, [formas, medida.ancho, alto]);

  const señalado = encima ? porId.get(encima.id) : null;
  const nombreSeñalado = encima
    ? (señalado?.entidad
      || (ALFA2_POR_ID[encima.id] ? nombreDePais(ALFA2_POR_ID[encima.id]) : null)
      || dibujo?.find(p => p.id === encima.id)?.nombre
      || '')
    : '';

  if (error) return <p className="text-sm text-red-600 text-center py-10">{error}</p>;

  return (
    <div className="w-full">
      <div ref={caja} className="relative">
        <div ref={ref} className="w-full" style={{ height: alto }}>
          {!dibujo && <p className="absolute inset-0 grid place-items-center text-sm text-slate-400">Cargando el mapa…</p>}
          {dibujo && (
            <svg width={medida.ancho} height={alto} role="img">
              {/* El mar, para que se vea dónde acaba la tierra. */}
              <rect width={medida.ancho} height={alto} fill="#f8fafc" />
              {dibujo.map(p => {
                const dato = porId.get(p.id);
                const color = dato ? (colorDe(tramos, dato.v) ?? SIN_DATO) : SIN_DATO;
                return (
                  <path
                    key={`${p.id}-${p.nombre}`}
                    d={p.d}
                    fill={color}
                    stroke={CROMADO.fondo}
                    strokeWidth={0.5}
                    onMouseEnter={e => {
                      const c = caja.current?.getBoundingClientRect();
                      setEncima({ id: p.id, x: e.clientX - (c?.left ?? 0), y: e.clientY - (c?.top ?? 0) });
                    }}
                    onMouseLeave={() => setEncima(null)}
                    style={{ cursor: dato ? 'pointer' : 'default' }}
                  />
                );
              })}
              {encima && (
                <path
                  d={dibujo.find(p => p.id === encima.id)?.d}
                  fill="none" stroke={CROMADO.tintaPrimaria} strokeWidth={1.25} pointerEvents="none"
                />
              )}
            </svg>
          )}
        </div>

        {encima && (
          <div
            className="absolute pointer-events-none bg-white border border-slate-200 rounded-xl shadow-lg px-2.5 py-1.5 text-[11px] z-20 whitespace-nowrap"
            style={{ left: Math.min(encima.x + 12, Math.max(0, medida.ancho - 170)), top: Math.max(0, encima.y - 40) }}
          >
            <p className="font-black text-slate-900">{nombreSeñalado}</p>
            <p className="text-slate-500">
              {señalado
                ? <span className="font-bold text-slate-900 tabular-nums">{numero(señalado.v, unidad)}</span>
                : 'Sin dato'}
              {momento && señalado ? <span className="text-slate-400"> · {momento}</span> : null}
            </p>
          </div>
        )}
      </div>

      {/* LA LEYENDA. Los tramos con su corte, y el gris del «sin dato» aparte:
          no es el color más claro de la rampa, es otra cosa. */}
      {tramos.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-500">
          <div className="flex items-center">
            {tramos.map(t => (
              <span key={t.desde} className="flex flex-col items-start">
                <span className="block w-11 h-3" style={{ background: t.color }} />
                <span className="tabular-nums mt-0.5">{numero(t.desde, { ...unidad, abreviar: true })}</span>
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: SIN_DATO }} /> Sin dato
          </span>
        </div>
      )}

      {fuera.length > 0 && (
        <p className="mt-2 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          <span className="font-bold">{fuera.length}</span> {fuera.length === 1 ? 'fila no se ha podido situar' : 'filas no se han podido situar'} en el mapa:{' '}
          {fuera.slice(0, 12).join(', ')}{fuera.length > 12 ? `… y ${fuera.length - 12} más` : ''}.
        </p>
      )}
    </div>
  );
}
