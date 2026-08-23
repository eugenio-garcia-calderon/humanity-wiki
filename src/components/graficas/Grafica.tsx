import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LineChart, BarChart3, Map as MapIcon, Table2, Download, Play, Pause, Image as ImageIcon, X, Plus, Search,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { TOPE_SERIES, colorDeSerie } from '../../utils/graficas/colores';
import { rotuloTiempo } from '../../utils/graficas/formato';
import { descargarPNG, descargarSVG } from '../../utils/graficas/descargas';
import {
  corte, dividir, entidadesDe, mediaMovil, rangoDeTiempo, relativoAlPrimero, series as construirSeries,
  type Serie, type Tabla,
} from '../../utils/graficas/tabla';
import type { ConfigGrafica, Pestaña } from '../../utils/graficas/config';
import Lineas from './Lineas';
import Barras from './Barras';
import MapaMundo from './MapaMundo';
import TablaDatos from './TablaDatos';

// ============================================================================
// LA GRÁFICA COMPLETA (2026-08-23)
// ============================================================================
// La cáscara que convierte un dibujo en una herramienta, que es exactamente lo
// que separa a Our World in Data de «una librería de gráficas»: las mismas
// líneas, pero con quién sale, en qué años, en qué escala, y con el mapa, la
// tabla y la descarga a un clic.
//
// DOS ESTADOS DISTINTOS, y no mezclarlos es lo que hace que esto funcione:
//   · LA CONFIGURACIÓN (`config`) es lo que se guarda: de dónde salen los
//     datos, qué columna es qué, cómo se llama la gráfica y con qué se abre.
//   · LA VISTA es lo que estás mirando ahora: qué países has marcado, en qué
//     años, en qué pestaña. Se pierde al salir y no ensucia lo guardado.
// Es la misma separación que tienen ellos entre la fila de la base de datos y
// los parámetros de la dirección.
//
// EL TOPE DE OCHO SERIES NO ES PEREZA. Nuestra paleta tiene ocho colores y NO
// se repite en ciclo: el noveno país con el color del primero dice que son el
// mismo país. Cuando se marcan más, se avisa y se dibujan los ocho primeros.

const PESTAÑAS: Array<{ id: Pestaña; label: string; icon: any }> = [
  { id: 'grafica', label: 'Gráfica', icon: LineChart },
  { id: 'mapa', label: 'Mapa', icon: MapIcon },
  { id: 'tabla', label: 'Tabla', icon: Table2 },
];

export default function Grafica({ tabla, config, alto = 400 }: {
  tabla: Tabla;
  config: ConfigGrafica;
  alto?: number;
}) {
  const caja = useRef<HTMLDivElement | null>(null);

  const todas = useMemo(() => entidadesDe(tabla, config.papeles.entidad), [tabla, config.papeles.entidad]);
  const rango = useMemo(() => rangoDeTiempo(tabla, config.papeles.tiempo), [tabla, config.papeles.tiempo]);

  // ---- La vista ----
  const [pestaña, setPestaña] = useState<Pestaña>(config.pestañas[0] || 'grafica');
  const [marcadas, setMarcadas] = useState<string[]>(() =>
    (config.entidades?.length ? config.entidades : todas.slice(0, Math.min(5, TOPE_SERIES))));
  const [desde, setDesde] = useState<number | null>(config.tiempo?.desde ?? rango?.[0] ?? null);
  const [hasta, setHasta] = useState<number | null>(config.tiempo?.hasta ?? rango?.[1] ?? null);
  const [log, setLog] = useState(config.ejeY?.escala === 'log');
  const [relativo, setRelativo] = useState(!!config.transformar?.relativo);
  const [suave, setSuave] = useState(config.transformar?.mediaMovil ?? 0);
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [tocando, setTocando] = useState(false);
  const [momento, setMomento] = useState<number | null>(rango?.[1] ?? null);

  // Las entidades y el rango se recalculan cuando cambia la tabla; sin esto,
  // cambiar de tabla deja marcados países que ya no existen.
  useEffect(() => {
    setMarcadas(config.entidades?.length ? config.entidades : todas.slice(0, Math.min(5, TOPE_SERIES)));
  }, [todas, config.entidades]);
  useEffect(() => {
    setDesde(config.tiempo?.desde ?? rango?.[0] ?? null);
    setHasta(config.tiempo?.hasta ?? rango?.[1] ?? null);
    setMomento(rango?.[1] ?? null);
  }, [rango, config.tiempo?.desde, config.tiempo?.hasta]);

  // ---- Los datos, ya transformados ----
  const seriesBase = useMemo(() => construirSeries(tabla, {
    entidad: config.papeles.entidad,
    tiempo: config.papeles.tiempo,
    valores: config.papeles.valores,
    desde, hasta,
  }), [tabla, config.papeles, desde, hasta]);

  /** El denominador del per cápita (o de la tasa que sea), si lo hay. */
  const denominadores = useMemo(() => {
    const col = config.transformar?.dividirPor;
    if (!col) return null;
    const m = new Map<string, Serie>();
    for (const s of construirSeries(tabla, {
      entidad: config.papeles.entidad, tiempo: config.papeles.tiempo, valores: [col], desde, hasta,
    })) m.set(s.entidad, s);
    return m;
  }, [tabla, config.papeles.entidad, config.papeles.tiempo, config.transformar?.dividirPor, desde, hasta]);

  const transformadas = useMemo(() => {
    let out = seriesBase;
    if (denominadores) {
      out = out
        .map(s => { const d = denominadores.get(s.entidad); return d ? dividir(s, d, config.transformar?.factor || 1) : null; })
        .filter(Boolean) as Serie[];
    }
    if (suave > 1) out = out.map(s => mediaMovil(s, suave));
    if (relativo) out = out.map(relativoAlPrimero);
    return out;
  }, [seriesBase, denominadores, suave, relativo, config.transformar?.factor]);

  const visibles = useMemo(() => {
    const elegidas = marcadas.length ? marcadas : todas.slice(0, TOPE_SERIES);
    const orden = new Map(elegidas.map((e, i) => [e, i]));
    return transformadas
      .filter(s => orden.has(s.entidad))
      .sort((a, b) => (orden.get(a.entidad)! - orden.get(b.entidad)!))
      .slice(0, TOPE_SERIES);
  }, [transformadas, marcadas, todas]);

  const sobran = Math.max(0, (marcadas.length || todas.length) - TOPE_SERIES);

  const instantes = useMemo(
    () => [...new Set(transformadas.flatMap(s => s.puntos.map(p => p.t)))].sort((a, b) => a - b),
    [transformadas],
  );

  /** Para el mapa y las barras: TODAS las entidades en un instante, no solo
   *  las marcadas — un mapa de cinco países no es un mapa. */
  const valoresDelMomento = useMemo(
    () => corte(transformadas, momento ?? 'ultimo'),
    [transformadas, momento],
  );

  // ---- La reproducción del tiempo ----
  useEffect(() => {
    if (!tocando || instantes.length < 2) return;
    const t = setInterval(() => {
      setMomento(m => {
        const i = instantes.indexOf(m ?? instantes[instantes.length - 1]);
        // Al llegar al final vuelve a empezar: es lo que se espera de un «play».
        return instantes[(i + 1) % instantes.length];
      });
    }, 550);
    return () => clearInterval(t);
  }, [tocando, instantes]);

  const unidad = relativo ? { sufijo: null, decimales: 1 } : config.unidad;
  const disponibles = PESTAÑAS.filter(p => config.pestañas.includes(p.id));

  const alternar = (e: string) => setMarcadas(m => (m.includes(e) ? m.filter(x => x !== e) : [...m, e]));

  const exportar = (formato: 'svg' | 'png') => {
    const svg = caja.current?.querySelector('svg');
    if (!svg) return;
    if (formato === 'svg') descargarSVG(svg as SVGSVGElement, config.titulo);
    else descargarPNG(svg as SVGSVGElement, config.titulo);
  };

  const filtradas = busqueda.trim()
    ? todas.filter(e => e.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : todas;

  const boton = 'px-2 py-1 rounded-lg text-[11px] font-bold transition-colors';

  return (
    <div className="w-full bg-white">
      {/* Cabecera */}
      <div className="mb-2">
        <h2 className="text-base font-black text-slate-900 leading-tight">{config.titulo}</h2>
        {config.subtitulo && <p className="text-xs text-slate-500 mt-0.5">{config.subtitulo}</p>}
      </div>

      {/* Pestañas y opciones */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-2 pb-2 border-b border-slate-100">
        {disponibles.length > 1 && (
          <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5">
            {disponibles.map(p => (
              <button
                key={p.id} onClick={() => setPestaña(p.id)}
                className={cn(boton, 'inline-flex items-center gap-1',
                  pestaña === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}
              >
                <p.icon className="w-3 h-3" /> {p.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {pestaña === 'grafica' && (
          <>
            <button
              onClick={() => setLog(v => !v)}
              title="Escala logarítmica: útil cuando unos valen mil veces más que otros"
              className={cn(boton, log ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
            >
              Log
            </button>
            <button
              onClick={() => setRelativo(v => !v)}
              title="Base 100 en el primer año: compara cómo han cambiado, no cuánto valen"
              className={cn(boton, relativo ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
            >
              Relativo
            </button>
            <select
              value={suave} onChange={e => setSuave(Number(e.target.value))}
              title="Media móvil: suaviza el ruido sin inventar datos"
              className="text-[11px] border border-slate-200 rounded-lg px-1.5 py-1 text-slate-600"
            >
              <option value={0}>Sin suavizar</option>
              <option value={3}>Media de 3</option>
              <option value={7}>Media de 7</option>
              <option value={30}>Media de 30</option>
            </select>
          </>
        )}

        <button onClick={() => exportar('png')} title="Descargar la imagen (PNG)" className={cn(boton, 'text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1')}>
          <ImageIcon className="w-3 h-3" /> PNG
        </button>
        <button onClick={() => exportar('svg')} title="Descargar el vector (SVG)" className={cn(boton, 'text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1')}>
          <Download className="w-3 h-3" /> SVG
        </button>
      </div>

      {/* Quién sale */}
      {todas.length > 0 && pestaña !== 'mapa' && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {marcadas.slice(0, TOPE_SERIES).map((e, i) => (
            <span
              key={e}
              className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: colorDeSerie(i) }}
            >
              {e}
              <button onClick={() => alternar(e)} className="hover:bg-black/20 rounded-full p-0.5" title={`Quitar ${e}`}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setBuscando(v => !v)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-slate-500 border border-dashed border-slate-300 hover:border-slate-400"
          >
            <Plus className="w-2.5 h-2.5" /> Añadir
          </button>
          {sobran > 0 && (
            <span className="text-[10px] text-amber-700" title="La paleta tiene ocho colores y no se repite: el noveno país llevaría el color del primero">
              +{sobran} sin dibujar (el máximo son {TOPE_SERIES})
            </span>
          )}
        </div>
      )}

      {buscando && (
        <div className="mb-2 border border-slate-200 rounded-xl p-2 max-h-52 overflow-auto">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Search className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="w-full text-[11px] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {filtradas.slice(0, 300).map(e => (
              <button
                key={e} onClick={() => alternar(e)}
                className={cn('px-1.5 py-0.5 rounded-full text-[10px] border',
                  marcadas.includes(e)
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-600 border-slate-200 hover:border-slate-400')}
              >
                {e}
              </button>
            ))}
            {!filtradas.length && <p className="text-[11px] text-slate-400">Nada con ese nombre.</p>}
          </div>
        </div>
      )}

      {/* El dibujo */}
      <div ref={caja}>
        {pestaña === 'grafica' && (
          config.tipo === 'barras'
            ? <Barras valores={valoresDelMomento} unidad={unidad} alto={alto} />
            : <Lineas
                series={visibles} unidad={unidad} alto={alto}
                escalaY={log ? 'log' : 'lineal'} porDias={config.porDias}
                desdeCero={config.ejeY?.desdeCero}
              />
        )}
        {pestaña === 'mapa' && (
          <MapaMundo
            valores={valoresDelMomento} unidad={unidad} alto={alto}
            momento={momento !== null ? rotuloTiempo(momento, !!config.porDias) : null}
          />
        )}
        {pestaña === 'tabla' && (
          <TablaDatos series={transformadas} unidad={unidad} porDias={config.porDias} titulo={config.titulo} />
        )}
      </div>

      {/* El tiempo. En la pestaña «Tabla» no sale: la tabla enseña TODOS los
          instantes a la vez, así que un deslizador ahí no movería nada. */}
      {rango && instantes.length > 1 && pestaña !== 'tabla' && (
        pestaña === 'grafica' && config.tipo === 'linea' ? (
          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
            <span className="tabular-nums w-16 shrink-0">{rotuloTiempo(desde ?? rango[0], !!config.porDias)}</span>
            <input
              type="range" min={rango[0]} max={rango[1]} value={desde ?? rango[0]}
              onChange={e => setDesde(Math.min(Number(e.target.value), (hasta ?? rango[1]) - 1))}
              className="flex-1 accent-slate-900" aria-label="Desde"
            />
            <input
              type="range" min={rango[0]} max={rango[1]} value={hasta ?? rango[1]}
              onChange={e => setHasta(Math.max(Number(e.target.value), (desde ?? rango[0]) + 1))}
              className="flex-1 accent-slate-900" aria-label="Hasta"
            />
            <span className="tabular-nums w-16 text-right shrink-0">{rotuloTiempo(hasta ?? rango[1], !!config.porDias)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
            <button
              onClick={() => setTocando(v => !v)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"
              title={tocando ? 'Parar' : 'Ver cómo cambia con el tiempo'}
            >
              {tocando ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0} max={instantes.length - 1}
              value={Math.max(0, instantes.indexOf(momento ?? instantes[instantes.length - 1]))}
              onChange={e => { setTocando(false); setMomento(instantes[Number(e.target.value)]); }}
              className="flex-1 accent-slate-900" aria-label="Momento"
            />
            <span className="tabular-nums w-20 text-right shrink-0 font-bold text-slate-700">
              {rotuloTiempo(momento ?? instantes[instantes.length - 1], !!config.porDias)}
            </span>
          </div>
        )
      )}

      {/* De dónde salen los números. Sin esto una gráfica es una opinión. */}
      {(config.fuente || config.nota) && (
        <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5">
          {config.nota && <p>{config.nota}</p>}
          {config.fuente && <p><span className="font-bold">Fuente:</span> {config.fuente}</p>}
        </div>
      )}
    </div>
  );
}
