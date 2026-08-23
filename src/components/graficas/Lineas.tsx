import { useMemo, useState } from 'react';
import { scaleLinear, scaleLog } from 'd3-scale';
import { line as lineaD3 } from 'd3-shape';
import { CROMADO, colorDeSerie } from '../../utils/graficas/colores';
import { marcasLineales, marcasLogaritmicas, numero, rotuloTiempo, type Unidad } from '../../utils/graficas/formato';
import type { Serie } from '../../utils/graficas/tabla';
import { EjeX, EjeY } from './Ejes';
import { marcoDe, useMedida } from './lienzo';

// ============================================================================
// LÍNEAS EN EL TIEMPO (2026-08-23)
// ============================================================================
// La gráfica de la que cuelga todo lo demás, dibujada como la dibuja Our World
// in Data y por las mismas razones:
//
// · EL NOMBRE VA AL FINAL DE SU LÍNEA, no en una leyenda aparte. Es lo que
//   permite leer ocho países sin ir y volver a un cuadrito de la esquina — y
//   es además lo que exige nuestra paleta: tres de los ocho colores no llegan
//   a 3:1 de contraste sobre blanco, así que el color no puede ser lo único
//   que identifique una serie. Si algún día se quitan estos rótulos, hay que
//   volver a mirar la paleta.
//
// · SEGMENTOS RECTOS entre puntos medidos, sin curva suave. Una curva de Bézier
//   se inventa el camino entre dos años y dibuja subidas y bajadas que nadie
//   midió.
//
// · UN HUECO EN LOS DATOS ES UN HUECO. Donde no hay dato la línea se corta; no
//   se une el punto de antes con el de después como si no faltara nada.

export interface LineasProps {
  series: Serie[];
  unidad?: Unidad;
  escalaY?: 'lineal' | 'log';
  /** El eje del tiempo son fechas y no años. */
  porDias?: boolean;
  /** Empezar el eje en cero aunque los datos no bajen tanto. */
  desdeCero?: boolean;
  alto?: number;
}

/** Un rótulo de final de línea, ya colocado. */
interface Rotulo { texto: string; color: string; y: number; valor: number }

/**
 * Separa los rótulos que se pisan. Se ordenan por altura y se van empujando
 * hacia abajo lo justo; luego se comprueba que ninguno se salga por arriba.
 * Sin esto, cuatro países con valores parecidos escriben su nombre uno encima
 * de otro y no se lee ninguno.
 */
function separar(rotulos: Rotulo[], alto: number, minimo = 15): Rotulo[] {
  const orden = [...rotulos].sort((a, b) => a.y - b.y);
  for (let i = 1; i < orden.length; i++) {
    const previo = orden[i - 1];
    if (orden[i].y - previo.y < minimo) orden[i] = { ...orden[i], y: previo.y + minimo };
  }
  // Si al empujar se ha salido por abajo, se sube todo el bloque.
  const sobra = orden.length ? orden[orden.length - 1].y - alto : 0;
  if (sobra > 0) for (let i = 0; i < orden.length; i++) orden[i] = { ...orden[i], y: orden[i].y - sobra };
  return orden;
}

export default function Lineas({
  series, unidad, escalaY = 'lineal', porDias, desdeCero, alto = 380,
}: LineasProps) {
  const [ref, medida] = useMedida<HTMLDivElement>();
  const [encima, setEncima] = useState<number | null>(null);   // instante señalado

  const marco = marcoDe({ ancho: medida.ancho, alto });
  const listas = series.filter(s => s.puntos.length > 0);

  const calculo = useMemo(() => {
    if (!listas.length || marco.anchoDatos < 10) return null;

    let tMin = Infinity, tMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    for (const s of listas) for (const p of s.puntos) {
      if (p.t < tMin) tMin = p.t;
      if (p.t > tMax) tMax = p.t;
      if (p.v < vMin) vMin = p.v;
      if (p.v > vMax) vMax = p.v;
    }
    if (tMin === tMax) { tMin -= 0.5; tMax += 0.5; }

    const log = escalaY === 'log';
    // En logarítmico el cero y los negativos no existen. En vez de tirar la
    // gráfica, se avisa arriba y se dibuja lo que sí se puede.
    const positivos = listas.flatMap(s => s.puntos.map(p => p.v)).filter(v => v > 0);
    const minLog = positivos.length ? Math.min(...positivos) : 1;

    let y0 = log ? minLog : (desdeCero ? Math.min(0, vMin) : vMin);
    let y1 = vMax;
    if (y0 === y1) { y0 = log ? y0 / 10 : y0 - 1; y1 = log ? y1 * 10 : y1 + 1; }
    else if (!log) {
      // Un respiro arriba y abajo para que la línea no toque el borde.
      const aire = (y1 - y0) * 0.06;
      y1 += aire;
      if (!desdeCero || y0 < 0) y0 -= aire;
    }

    const ex = scaleLinear().domain([tMin, tMax]).range([marco.x0, marco.x1]);
    const ey = log
      ? scaleLog().domain([y0, y1]).range([marco.y1, marco.y0]).clamp(true)
      : scaleLinear().domain([y0, y1]).range([marco.y1, marco.y0]);

    const camino = lineaD3<{ t: number; v: number }>()
      .x(p => ex(p.t))
      .y(p => ey(p.v))
      // Un valor que no cabe en la escala (un 0 en logarítmico) parte la línea
      // en vez de pegarse al suelo fingiendo que vale el mínimo.
      .defined(p => Number.isFinite(p.v) && (!log || p.v > 0));

    const marcasY = log ? marcasLogaritmicas(y0, y1) : marcasLineales(y0, y1, Math.max(3, Math.round(marco.altoDatos / 55)));
    const marcasX = marcasLineales(tMin, tMax, Math.max(2, Math.min(8, Math.round(marco.anchoDatos / 90))))
      .filter(v => !porDias ? Number.isInteger(v) : true);

    const instantes = [...new Set(listas.flatMap(s => s.puntos.map(p => p.t)))].sort((a, b) => a - b);
    const descartados = log ? listas.flatMap(s => s.puntos).filter(p => p.v <= 0).length : 0;

    return { ex, ey, camino, marcasX, marcasY, instantes, descartados, log };
  }, [listas, marco.x0, marco.x1, marco.y0, marco.y1, marco.anchoDatos, marco.altoDatos, escalaY, desdeCero, porDias]);

  const rotulos = useMemo(() => {
    if (!calculo) return [];
    const brutos: Rotulo[] = listas.map((s, i) => {
      const ultimo = s.puntos[s.puntos.length - 1];
      return {
        texto: s.entidad, color: colorDeSerie(i),
        y: calculo.ey(Math.max(ultimo.v, calculo.log ? 1e-12 : ultimo.v)), valor: ultimo.v,
      };
    }).filter(r => Number.isFinite(r.y));
    return separar(brutos, marco.y1);
  }, [calculo, listas, marco.y1]);

  const señalado = useMemo(() => {
    if (encima === null || !calculo) return null;
    return listas.map((s, i) => {
      const p = s.puntos.find(x => x.t === encima);
      return p ? { entidad: s.entidad, color: colorDeSerie(i), v: p.v } : null;
    }).filter(Boolean) as Array<{ entidad: string; color: string; v: number }>;
  }, [encima, calculo, listas]);

  /** El instante más cercano al ratón: la cruz se engancha a datos reales. */
  const alMover = (e: React.MouseEvent<SVGRectElement>) => {
    if (!calculo) return;
    const caja = e.currentTarget.getBoundingClientRect();
    const t = calculo.ex.invert(e.clientX - caja.left + marco.x0);
    let mejor = calculo.instantes[0];
    for (const i of calculo.instantes) if (Math.abs(i - t) < Math.abs(mejor - t)) mejor = i;
    setEncima(mejor);
  };

  return (
    <div ref={ref} className="w-full relative" style={{ height: alto }}>
      {calculo && calculo.descartados > 0 && (
        <p className="absolute top-0 left-0 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 z-10">
          {calculo.descartados} {calculo.descartados === 1 ? 'valor' : 'valores'} de cero o negativos no caben en una escala logarítmica
        </p>
      )}

      {!listas.length && (
        <p className="absolute inset-0 grid place-items-center text-sm text-slate-400">No hay datos que dibujar.</p>
      )}

      {calculo && medida.ancho > 0 && (
        <svg width={medida.ancho} height={alto} role="img">
          <EjeY marco={marco} marcas={calculo.marcasY} escala={calculo.ey} unidad={unidad} />
          <EjeX marco={marco} marcas={calculo.marcasX} escala={calculo.ex} porDias={porDias} />

          {encima !== null && (
            <line
              x1={calculo.ex(encima)} x2={calculo.ex(encima)} y1={marco.y0} y2={marco.y1}
              stroke={CROMADO.ejeBase} strokeWidth={1} strokeDasharray="3 3"
            />
          )}

          {listas.map((s, i) => (
            <path
              key={`${s.variable}·${s.entidad}`}
              d={calculo.camino(s.puntos) || undefined}
              fill="none" stroke={colorDeSerie(i)} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"
            />
          ))}

          {/* El punto del instante señalado, con anillo del color del fondo para
              que dos series que se cruzan no se fundan en una mancha. */}
          {encima !== null && listas.map((s, i) => {
            const p = s.puntos.find(x => x.t === encima);
            if (!p || (calculo.log && p.v <= 0)) return null;
            return (
              <circle
                key={`p${i}`} cx={calculo.ex(p.t)} cy={calculo.ey(p.v)} r={4.5}
                fill={colorDeSerie(i)} stroke={CROMADO.fondo} strokeWidth={2}
              />
            );
          })}

          {rotulos.map(r => (
            <text
              key={r.texto} x={marco.x1 + 8} y={r.y} dy="0.32em"
              fontSize={11} fontWeight={600} fill={r.color}
            >
              {r.texto.length > 16 ? `${r.texto.slice(0, 15)}…` : r.texto}
            </text>
          ))}

          {/* La zona sensible al ratón, del tamaño de los datos: el objetivo es
              toda la gráfica y no cada línea de dos píxeles. */}
          <rect
            x={marco.x0} y={marco.y0} width={marco.anchoDatos} height={marco.altoDatos}
            fill="transparent"
            onMouseMove={alMover}
            onMouseLeave={() => setEncima(null)}
          />
        </svg>
      )}

      {encima !== null && señalado && señalado.length > 0 && calculo && (
        <div
          className="absolute pointer-events-none bg-white border border-slate-200 rounded-xl shadow-lg px-2.5 py-1.5 text-[11px] z-20"
          style={{
            left: Math.min(calculo.ex(encima) + 12, Math.max(0, medida.ancho - 190)),
            top: marco.y0,
          }}
        >
          <p className="font-black text-slate-900 mb-1">{rotuloTiempo(encima, !!porDias)}</p>
          {señalado
            .sort((a, b) => b.v - a.v)
            .slice(0, 10)
            .map(s => (
              <p key={s.entidad} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-slate-500 truncate max-w-[110px]">{s.entidad}</span>
                <span className="ml-auto font-bold text-slate-900 tabular-nums">{numero(s.v, unidad)}</span>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
