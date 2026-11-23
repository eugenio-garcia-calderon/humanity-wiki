// The Triciclo family's bicycle blocks (2026-11-24). Eugenio: «vehículos ligeros con componentes de piezas de
// bicicleta … bicicletas de 4 ruedas … pon una marca que diferencia los componentes que son de bicicleta de los
// componentes que son para vehículos pesados … permite poner pedales al conductor y vamos a trabajar siempre con
// chainless electric pedaling … y añade también precio de cada componente».
//  - `BloqueClaseBici` («Rodaje › Componentes de bicicleta»): the vehicle's class of components, and the bicycle brake
//    and suspension of every wheel, each with its sheet (mass, price, where it was read);
//  - `BloquePedales` («Motor › Pedales»): the driver's chainless pedals, what the legs give and what that changes.
// The numbers come from bici/ (catalogo.ts, clase.ts, pedales.ts); the fields other than `tClase` are not in `FILAS`
// (campos.ts): they are optional on a design, as the cooling's.
import type { ModeloTriciclo, Parametros } from './geometria';
import { Bloque, Deslizador, MarcaClase, Selector, fmt } from './controles';
import { DesglosePeso } from './PesoSeccion';
import { textoPesoSeccion, type SeccionPeso } from './masasSecciones';
import { eur, textoPesoPrecio, type PrecioSeccion } from './precios/precios';
import { OPCIONES_FRENO, OPCIONES_GENERADOR, OPCIONES_SUSPENSION, frenoBici, generadorPedal, suspensionBici, type PiezaBici } from './bici/catalogo';
import { OPCIONES_CLASE, VALORES_BICI, esBici, type ClaseVehiculo } from './bici/clase';
import { BICI_DEFECTO, FILAS_BICI, OPCIONES_PEDALES, camposBici, type ClaveBici, type Pedaleo } from './bici/pedales';
import { TRICICLO_DEFECTO } from './triciclo/defecto';
import type { CamposTriciclo } from './triciclo/campos';

export const BLOQUE_PEDALES = 'Pedales';

type Poner = <K extends keyof Parametros>(k: K, v: Parametros[K]) => void;
type Plegable = { abierto: boolean; alAlternar: () => void };
type Precios = { s: PrecioSeccion | null; alCambiar: (nombre: string, v: number | null) => void };

/** A catalogue part's sheet: what it weighs, what it costs and where both were read. */
function FichaBici({ p, por }: { p: PiezaBici | null; por: string }) {
  if (!p) return null;
  return (
    <div className="rounded-md border border-teal-200 bg-teal-50/50 px-2 py-1.5 text-xs text-slate-600">
      <p><span className="font-medium text-slate-800">{fmt(p.kg, 2)} kg</span> {por} · <span className="font-medium text-slate-800">{eur(p.precio.eur)}</span> {p.precio.tipo === 'publicado' ? '(precio de tienda)' : '(precio estimado)'}</p>
      <p className="mt-0.5">{p.nota}</p>
      <p className="mt-0.5 text-slate-500">Peso: {p.masa}. Precio: {p.precio.nota}.{' '}
        <a href={p.precio.fuente ?? p.fuente} target="_blank" rel="noreferrer" className="text-teal-700 underline">Fuente</a></p>
    </div>
  );
}

/** «Rodaje › Componentes de bicicleta»: the class, and every wheel's bicycle brake and suspension. */
export function BloqueClaseBici({ P, T, set, bloque, seccion, plegable }: { P: Parametros; T: CamposTriciclo; set: Poner; bloque: string; seccion?: SeccionPeso | null; plegable?: Plegable }) {
  const C = camposBici(P), bici = esBici(T);
  const poner = (k: ClaveBici, v: number | string) => set(k as keyof Parametros, v as never);
  // the whole preset at once, and back: the wheels, the frame tube, the motor and the battery are different parts
  const cambiarClase = (v: ClaseVehiculo) => {
    if (v === 'bici') { for (const [k, x] of Object.entries(VALORES_BICI)) set(k as keyof Parametros, x as never); return; }
    for (const k of Object.keys(VALORES_BICI)) set(k as keyof Parametros, TRICICLO_DEFECTO[k as keyof CamposTriciclo] as never);
    poner('tBiciFreno', BICI_DEFECTO.tBiciFreno); poner('tBiciSusp', BICI_DEFECTO.tBiciSusp);
  };
  return (
    <Bloque id={`bloque-${bloque}`} titulo="Componentes de bicicleta" peso={textoPesoSeccion(seccion ?? null)} plegable={plegable} nota={bici ? 'de bicicleta' : 'de vehículo pesado'}>
      <p className="-mt-1 text-xs text-slate-500">
        El mismo vehículo se puede montar con dos clases de piezas. Las de <strong>vehículo pesado</strong> son las de moto y de coche que había hasta ahora. Las de <strong>bicicleta</strong> son las de las
        bicicletas de carga y los velomóviles de cuatro ruedas (como el Quattrovelo): ruedas de radios, frenos y amortiguadores de bici, tubo fino, motores de buje pequeños y una batería de bici.
        En las listas, cada pieza lleva su marca: <MarcaClase clase="bici" /> o <MarcaClase clase="pesado" />.
      </p>
      <Selector id="t-tClase" etiqueta="Clase de componentes" valor={T.tClase} opciones={OPCIONES_CLASE} alCambiar={cambiarClase} />
      <p className="-mt-1 text-xs text-slate-500">
        {bici
          ? 'Con piezas de bicicleta, los deslizadores del motor, la batería, el bastidor y las masas bajan a lo que pesa y da una pieza de bici (un motor desde 250 W, una batería desde 0,3 kWh, tubo desde 20 mm). Volver a «Vehículo pesado» devuelve esas piezas a las de serie del editor, no a las que tenía este diseño.'
          : 'Al pasar a «Bicicleta» cambian de golpe las ruedas (de bici de carga, 125 kg cada una), el tubo del bastidor, el motor (250 W en total), la batería (1,4 kWh) y la velocidad (25 km/h). La forma, los asientos y las puertas no se tocan. Guarda antes el diseño si quieres conservarlo como está.'}
      </p>
      <Selector id="t-tBiciFreno" etiqueta="Frenos (todas las ruedas)" valor={C.tBiciFreno} opciones={OPCIONES_FRENO} alCambiar={v => poner('tBiciFreno', v)} />
      <FichaBici p={frenoBici(C.tBiciFreno)} por="por rueda" />
      <Selector id="t-tBiciSusp" etiqueta="Suspensión (todas las esquinas)" valor={C.tBiciSusp} opciones={OPCIONES_SUSPENSION} alCambiar={v => poner('tBiciSusp', v)} />
      <FichaBici p={suspensionBici(C.tBiciSusp)} por="por esquina, con sus brazos" />
      <p className="text-xs text-slate-500">
        «A medida» deja el peso de frenos y suspensión a los deslizadores de «Masas» y a la carga de cada rueda. Las ruedas se eligen arriba, en «Ruedas»; el tubo, en «Bastidor»; los motores y sus controladores de bici,
        en «Motor › Motor eléctrico»; y los pedales, en «Motor › Pedales».
      </p>
    </Bloque>
  );
}

/** «Motor › Pedales»: the driver's chainless pedals. */
export function BloquePedales({ P, set, modelo, pedaleo, kmh, autonomia, seccion, precios, plegable }: {
  P: Parametros; set: Poner; modelo: ModeloTriciclo; pedaleo: Pedaleo | null; kmh: number; autonomia: number | null;
  seccion: SeccionPeso | null; precios: Precios; plegable?: Plegable;
}) {
  const C = camposBici(P), con = C.tPedales === 'si', p = modelo.pedalesBici, gen = generadorPedal(C.tPedGen);
  const poner = (k: ClaveBici, v: number | string) => set(k as keyof Parametros, v as never);
  const filas = FILAS_BICI.filter(([k]) => con && !(gen && k === 'tPedKg'));
  const km = (v: number) => (Number.isFinite(v) ? `${Math.round(v)} km` : 'sin gastar batería');
  return (
    <Bloque id={`bloque-${BLOQUE_PEDALES}`} titulo="Pedales del conductor (sin cadena)" peso={textoPesoPrecio(textoPesoSeccion(seccion), precios.s)} plegable={plegable} nota={con ? `${Math.round(C.tPedW)} W de piernas` : 'sin pedales'}>
      <p className="-mt-1 text-xs text-slate-500">
        Pedaleo sin cadena: los pedales no mueven las ruedas, mueven un generador. La electricidad que sale va a la batería y a los motores por un cable, así que no hay cadena, piñones ni cambio, y los pedales pueden ir donde quepan los pies.
        A cambio se pierde algo por el camino: de lo que dan las piernas, a las ruedas llega menos que con una cadena.
      </p>
      <Selector id="t-tPedales" etiqueta="Pedales" valor={C.tPedales} opciones={OPCIONES_PEDALES} alCambiar={v => poner('tPedales', v)} />
      {con && <Selector id="t-tPedGen" etiqueta="Generador de pedales" valor={C.tPedGen} opciones={OPCIONES_GENERADOR} alCambiar={v => poner('tPedGen', v)} />}
      {con && <FichaBici p={gen} por="el generador" />}
      {filas.map(([k, n, min, max, paso, u]) => (
        <Deslizador key={k} id={`t-${k}`} etiqueta={n} valor={C[k]} min={min} max={max} paso={paso}
          mostrar={u === 'mm' && k !== 'tPedBiela' ? `${C[k] >= 0 ? '+' : '−'}${fmt(Math.abs(C[k]) / 10, 0)} cm` : `${fmt(C[k], paso < 1 ? 1 : 0)} ${u}`} alCambiar={x => poner(k, x)} />
      ))}
      {con && p && pedaleo && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-[13px]">
          <dt className="text-slate-600">Electricidad que dan las piernas</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(pedaleo.electricos)} W de {Math.round(pedaleo.W)} W</dd>
          <dt className="text-slate-600">Parte de lo que pide el vehículo a {Math.round(kmh)} km/h</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(pedaleo.parte * 100)} %</dd>
          <dt className="text-slate-600">Consumo de batería pedaleando</dt><dd className="text-right font-mono text-xs tabular-nums">{fmt(pedaleo.WhKm, 1)} Wh/km</dd>
          <dt className="text-slate-600">Autonomía pedaleando{autonomia != null ? ` (sin pedalear: ${Math.round(autonomia)} km)` : ''}</dt><dd className="text-right font-mono text-xs tabular-nums">{km(pedaleo.autonomia)}</dd>
          <dt className="text-slate-600">Velocidad solo con las piernas, en llano</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(pedaleo.vSolo)} km/h</dd>
          <dt className="text-slate-600">Sitio de los pies al dar la vuelta</dt><dd className="text-right font-mono text-xs tabular-nums">{p.holgura >= 0 ? `sobran ${fmt(p.holgura * 100, 1)} cm` : `faltan ${fmt(-p.holgura * 100, 1)} cm`}</dd>
          {p.rodillaVolante != null && <><dt className="text-slate-600">Rodillas al volante, pedaleando</dt><dd className="text-right font-mono text-xs tabular-nums">{p.rodillaVolante >= 0 ? `sobran ${fmt(p.rodillaVolante * 100, 1)} cm` : `chocan por ${fmt(-p.rodillaVolante * 100, 1)} cm`}</dd></>}
        </dl>
      )}
      {con && !pedaleo && <p className="text-xs text-slate-500">Las cifras del pedaleo salen cuando el túnel termina de calcular el Cd.</p>}
      {con && (
        <p className="text-xs text-slate-500">
          El eje de los pedales se coloca solo: el pie dibujado es la pierna estirada, y el eje queda una biela por detrás; los dos deslizadores de «Eje de los pedales» lo mueven desde ahí.
          El editor comprueba, en toda la vuelta, que los zapatos y las rodillas caben en la carrocería, que la pierna llega y que las rodillas no dan en el volante (pestaña Interior, «Comprobaciones»).
          Cuánto rinde un generador de pedales no lo publica ningún fabricante: el {Math.round(C.tPedRend)} % es una estimación, y con él y el motor a las ruedas llega cerca del 70 % de las piernas.
          Una persona en forma sostiene de 50 a 150 W durante una hora. Legalmente no está claro que un pedalier que solo mueve un generador cuente como «pedaleo asistido»: está anotado en Homologación.
        </p>
      )}
      <DesglosePeso s={seccion} precios={precios} />
    </Bloque>
  );
}
