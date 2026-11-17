// The Triciclo's «Refrigeración y tomas de aire» block (2026-11-17, bot «capo»): the intake (none, one or two nose
// mouths, side gills), its geometry, where the radiator goes, its size, the coolant pipes' bore, and the hood. The
// numbers come from triciclo/refrigeracion.ts; the 3D from visor/refrigeracion.ts. Its fields are not in `FILAS`
// (campos.ts): they live in `FILAS_REFRIGERACION`, optional on a design (absent: «Ninguna», the car as before).
import type { ModeloTriciclo, Parametros } from './geometria';
import { Bloque, Deslizador, Selector, fmt } from './controles';
import { DesglosePeso } from './PesoSeccion';
import { textoPesoSeccion, type SeccionPeso } from './masasSecciones';
import { FILAS_REFRIGERACION, OPCIONES_MOTOR, OPCIONES_RADIADOR, OPCIONES_TOMA, camposRefrigeracion, refrigeracionDe, type ClaveRefrigeracion } from './triciclo/refrigeracion';

export const BLOQUE_REFRIGERACION = 'Refrigeración';

export function BloqueRefrigeracion({ P, set, modelo, seccion, plegable }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; modelo: ModeloTriciclo;
  seccion: SeccionPeso | null; plegable?: { abierto: boolean; alAlternar: () => void };
}) {
  const C = camposRefrigeracion(P), r = refrigeracionDe(modelo);
  const poner = (k: ClaveRefrigeracion, v: number | string) => set(k as keyof Parametros, v as never);
  const morro = C.tToma === 'morro1' || C.tToma === 'morro2';
  const filas = FILAS_REFRIGERACION.filter(([, , , , , , cuando]) => C.tToma !== 'ninguna' && (cuando === null || (cuando === 'morro' && morro) || (cuando === 'morro2' && C.tToma === 'morro2') || (cuando === 'branquias' && C.tToma === 'branquias')));
  const kW = (v: number) => `${fmt(v, 1)} kW`;
  return (
    <Bloque id={`bloque-${BLOQUE_REFRIGERACION}`} titulo="Refrigeración y tomas de aire" peso={textoPesoSeccion(seccion)} plegable={plegable} nota={C.tToma === 'ninguna' ? 'sin toma' : OPCIONES_TOMA.find(o => o.k === C.tToma)?.n}>
      <p className="-mt-1 text-xs text-slate-500">
        El motor de gasolina tiene que soltar su calor en algún sitio: una toma de aire, un radiador detrás y dos tubos que llevan el refrigerante del motor al radiador (rojo, caliente) y de vuelta (azul).
        La toma puede ser una boca en el morro, dos bocas (una a cada lado del morro) o unas branquias en los dos costados, bajas, justo antes de que empiece la cola, que recogen el aire como colectores.
        Las aberturas son agujeros de verdad en la carrocería, con su embellecedor y un conducto oscuro hasta el radiador. El capó (lo alto del morro) se abre con «Abrir maletero y capó», abajo en el 3D.
      </p>
      <Selector id="t-tMotorPos" etiqueta="Motor de gasolina" valor={C.tMotorPos} opciones={OPCIONES_MOTOR} alCambiar={v => poner('tMotorPos', v)} />
      {C.tMotorPos === 'delante' && <p className="-mt-1 text-xs text-slate-500">Delante: el motor va en el morro, por delante de los pies del piloto, lo más atrás y abajo que cabe. {modelo.phev?.arq === 'serie' ? 'En serie solo hace electricidad: un cable lleva la corriente al controlador.' : 'Empuja la rueda trasera con un árbol de transmisión a lo largo del suelo hasta el piñón de la cadena, que sigue igual.'} El depósito se queda detrás de los asientos y el escape va por debajo del suelo hasta la cola. Sus choques (la rueda del morro o la dirección, los pies, la piel) los dicen las comprobaciones.</p>}
      <Selector id="t-tToma" etiqueta="Toma de aire" valor={C.tToma} opciones={OPCIONES_TOMA} alCambiar={v => poner('tToma', v)} />
      {C.tToma !== 'ninguna' && <Selector id="t-tRad" etiqueta="Radiador" valor={C.tRad} opciones={OPCIONES_RADIADOR} alCambiar={v => poner('tRad', v)} />}
      {filas.map(([k, n, min, max, paso, u]) => (
        <Deslizador key={k} id={`t-${k}`} etiqueta={n} valor={C[k] as number} min={min} max={max} paso={paso}
          mostrar={`${fmt(C[k] as number, paso < 1 ? 1 : 0)}${u ? ` ${u}` : ''}`} alCambiar={x => poner(k, x)} />
      ))}
      {r && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-[13px]">
          <dt className="text-slate-600">Abertura total de la toma</dt><dd className="text-right font-mono text-xs tabular-nums">{fmt(r.areaToma * 100, 2)} dm² ({Math.round(r.areaToma / r.areaRadiador * 100)} % del radiador)</dd>
          <dt className="text-slate-600">Radiador{r.radiadores.length > 1 ? `es (${r.radiadores.length})` : ''}</dt><dd className="text-right font-mono text-xs tabular-nums">{r.sitio === 'delante' ? 'en el morro' : 'a los lados'} · {fmt(r.areaRadiador * 100, 1)} dm²</dd>
          <dt className="text-slate-600">Calor del motor a plena potencia</dt><dd className="text-right font-mono text-xs tabular-nums">{kW(r.calor.motor)}</dd>
          <dt className="text-slate-600">Lo que saca el radiador subiendo despacio, 35 °C</dt><dd className="text-right font-mono text-xs tabular-nums">{kW(r.calor.radiador)}</dd>
          <dt className="text-slate-600">Tubos de refrigerante (ida y vuelta)</dt><dd className="text-right font-mono text-xs tabular-nums">{fmt(r.tubos.largo, 1)} m de {Math.round(r.tubos.d * 1000)} mm</dd>
          <dt className="text-slate-600">Arrastre del aire de refrigeración</dt><dd className="text-right font-mono text-xs tabular-nums">+{fmt(r.dCdA, 3)} m² de CdA</dd>
        </dl>
      )}
      {r && <p className="text-xs text-slate-500">Estimaciones de la literatura, no medidas ni del túnel: el calor que va al refrigerante es el 25 % de la energía de la gasolina a plena carga (Heywood, 1988); el radiador, con su ventilador (3 m/s en la cara), a 105 °C contra aire a 35 °C, con una eficacia de 0,5. La boca conviene que sea al menos el 25 % de la cara del radiador (Hucho). El túnel solo ve la silueta, no ve el aire que entra por la boca: lo que cuesta ese aire (≈ 0,5 × el área de la boca en CdA, Hucho) se suma aparte al consumo.</p>}
      {!r && C.tToma !== 'ninguna' && <p className="text-xs text-slate-500">Solo con la propulsión híbrida enchufable (hay motor de gasolina que enfriar).</p>}
      <DesglosePeso s={seccion} />
    </Bloque>
  );
}
