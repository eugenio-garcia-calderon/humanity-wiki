// The «Masas» tab (2026-11-17, Eugenio: «que haya un cálculo de centro de gravedad y de pesos en cada eje, que
// aparezca en un nuevo apartado del menú que sea MASAS, y te de esta relación calculado»): the total mass, the centre
// of gravity in three axes, the load on each axle and wheel, who weighs most and what it does to the height, and the
// checks that follow from where the mass is. It computes nothing: `masasVehiculo.ts` adds up the parts lists the
// vehicles already make. The 3D draws the centre of gravity while this tab is open (Visor3D `centroGravedad`).
import { Fragment, useState } from 'react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import type { Comprobacion } from './geometria';
import type { AnalisisMasas, EstadoMasas, Masa } from './masasVehiculo';
import { aporteAltura, AGARRE_MOJADO, CUESTA, FRENADA } from './masasVehiculo';
import { Bloque, ListaComprobaciones, fmt, m2 } from './controles';

const cm = (v: number, d = 0) => `${fmt(v * 100, d)} cm`;
const kg = (v: number, d = 1) => `${fmt(v, d)} kg`;
const pc = (v: number) => `${Math.round(v * 100)} %`;

/** The groups of the parts list, in the order of the department tabs. */
const GRUPOS: [string, string][] = [['carroceria', 'Carrocería'], ['chasis', 'Chasis'], ['rodaje', 'Rodaje'], ['propulsion', 'Motor'], ['energia', 'Energía'], ['interior', 'Interior']];

/** A side view and a plan view, to scale: the wheels with their loads and the centre of gravity. */
function Esquema({ a, e, alto }: { a: AnalisisMasas; e: EstadoMasas; alto: number }) {
  const xs = a.ruedas.map(r => r.x), x0 = Math.min(...xs) - 0.5, x1 = Math.max(...xs) + 0.5, W = 340, k = W / (x1 - x0);
  const X = (x: number) => (x1 - x) * k;  // the front on the left, as the 3D's side view
  const zMax = Math.max(0.4, ...a.ruedas.map(r => Math.abs(r.z))) + 0.45, H1 = 2 * zMax * k, Z = (z: number) => (zMax + z) * k;
  const H2 = Math.max(alto, e.cg.y + 0.3) * k, Y = (y: number) => H2 - y * k;
  const max = Math.max(...e.ruedas.map(r => r.kg), 1);
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H1 + H2 + 18}`} className="w-full" role="img" aria-label="Las ruedas con su carga y el centro de gravedad, vistos desde arriba y de lado">
        {/* plan view: each wheel a disc as big as its load */}
        <g>
          <line x1={0} x2={W} y1={Z(0)} y2={Z(0)} className="stroke-slate-200" strokeDasharray="4 3" />
          {e.ruedas.map((r, i) => { const w = a.ruedas[i]; return (
            <g key={r.nombre}>
              <circle cx={X(w.x)} cy={Z(w.z)} r={5 + 13 * Math.max(0, r.kg) / max} className={r.motriz ? 'fill-sky-200 stroke-sky-700' : 'fill-slate-200 stroke-slate-600'} />
              <text x={X(w.x)} y={Z(w.z) + (w.z >= 0 ? 26 : -20)} textAnchor="middle" className="fill-slate-700 text-[10px]">{Math.round(r.kg)} kg</text>
            </g>
          ); })}
          <g transform={`translate(${X(e.cg.x)} ${Z(e.cg.z)})`}><CdG /></g>
        </g>
        {/* side view: the ground, the wheels and the centre's height */}
        <g transform={`translate(0 ${H1 + 18})`}>
          <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} className="stroke-slate-400" />
          {[...new Set(a.ruedas.map(r => r.x))].map(x => <circle key={x} cx={X(x)} cy={Y(0.27)} r={0.27 * k} className="fill-none stroke-slate-400" />)}
          <line x1={X(e.cg.x)} x2={X(e.cg.x)} y1={Y(e.cg.y)} y2={Y(0)} className="stroke-amber-600" strokeDasharray="3 2" />
          <text x={X(e.cg.x) + 8} y={Y(e.cg.y / 2)} className="fill-amber-800 text-[10px]">{cm(e.cg.y)}</text>
          <g transform={`translate(${X(e.cg.x)} ${Y(e.cg.y)})`}><CdG /></g>
          <text x={4} y={Y(0) - 4} className="fill-slate-400 text-[9px]">delante</text>
        </g>
      </svg>
      <figcaption className="text-[11px] text-slate-400">Arriba, visto desde encima: cada rueda, tan grande como la carga que lleva (en azul, las que empujan). Abajo, de lado, a escala. El símbolo es el centro de gravedad.</figcaption>
    </figure>
  );
}
/** The usual centre-of-gravity symbol: a circle in four quarters, two filled. */
function CdG() {
  return (
    <g>
      <circle r={7} className="fill-white stroke-slate-900" strokeWidth={1.5} />
      <path d="M0 0 L7 0 A7 7 0 0 0 0 -7 Z M0 0 L-7 0 A7 7 0 0 0 0 7 Z" className="fill-slate-900" />
    </g>
  );
}

export function PanelMasas({ a, checks, vuelco, alturaVehiculo, notaEstimacion, hibrido }: {
  a: AnalisisMasas;
  /** The checks that depend on where the mass is (rollover, braking, hill, balance, side; the hybrid's placement). */
  checks: Comprobacion[];
  /** The rollover threshold with everyone and with the pilot alone (g), and what it is asked for; null: not computed for this vehicle. */
  vuelco: { ssf: number; ssfSolo: number; objetivo: number; agarre: number } | null;
  alturaVehiculo: number;
  notaEstimacion: string;
  /** The hybrid's engine and tank, to say what moving them does (kg); null without the hybrid. */
  hibrido: { kgMotor: number; kgDeposito: number } | null;
}) {
  const [cual, setCual] = useState<EstadoMasas['id']>('ocupado');
  const e = a.estados.find(s => s.id === cual) ?? a.estados[1] ?? a.estados[0];
  const oc = a.estados.find(s => s.id === 'ocupado') ?? e, vacio = a.estados[0];
  const xFront = Math.max(...a.ruedas.map(r => r.x)), xRear = Math.min(...a.ruedas.map(r => r.x));
  const parteDelante = (e.cg.x - xRear) / (xFront - xRear);
  const conAltura = [...a.lista].map(p => ({ p, d: aporteAltura(p, oc.cg) }));
  const sube = [...conAltura].sort((u, v) => v.d - u.d).filter(q => q.d > 0.001).slice(0, 5);
  const malas = checks.filter(c => c.holgura < c.minimo).length;
  // what lowering things would do (with everyone on board): the whole centre 10 cm, the engine and the tank 10 cm
  const bajar = (dy: number) => vuelco ? vuelco.ssf * oc.cg.y / (oc.cg.y - dy) : null;
  return (
    <>
      <Bloque titulo="Centro de gravedad" nota={`${kg(e.cg.masa, 0)} · ${cm(e.cg.y)} de alto`}>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Con qué carga">
          {a.estados.map(s => (
            <Button key={s.id} variant={s.id === e.id ? 'primary' : 'outline'} aria-pressed={s.id === e.id} onClick={() => setCual(s.id)} className="px-2 py-1 text-xs">{s.nombre}</Button>
          ))}
        </div>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
          <dt className="font-semibold text-slate-800">Masa total</dt><dd className="text-right font-mono text-xs font-semibold tabular-nums">{kg(e.cg.masa)}</dd>
          <dt className="text-slate-600">Altura sobre el suelo</dt><dd className="text-right font-mono text-xs tabular-nums">{cm(e.cg.y, 1)}</dd>
          <dt className="text-slate-600">Detrás del eje delantero{a.ruedas.some(r => r.eje === 'Morro') ? ' (de la rueda del morro)' : ''}</dt><dd className="text-right font-mono text-xs tabular-nums">{m2(xFront - e.cg.x)}</dd>
          <dt className="text-slate-600">Delante del eje trasero{a.ruedas.some(r => r.eje === 'Cola') ? ' (de la rueda de la cola)' : ''}</dt><dd className="text-right font-mono text-xs tabular-nums">{m2(e.cg.x - xRear)}</dd>
          <dt className="text-slate-600">De lado (desde el centro)</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.abs(e.cg.z) < 0.0005 ? 'en el centro' : `${cm(Math.abs(e.cg.z), 1)} a la ${e.cg.z > 0 ? 'derecha' : 'izquierda'}`}</dd>
        </dl>
        <Esquema a={a} e={e} alto={alturaVehiculo} />
      </Bloque>

      <Bloque titulo="Peso en cada eje y en cada rueda" nota={`${pc(parteDelante)} delante del eje trasero`}>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-1 text-[13px]">
          {e.ejes.map(q => (
            <Fragment key={q.nombre}>
              <dt className="font-semibold text-slate-800">{q.nombre}</dt><dd className="text-right font-mono text-xs font-semibold tabular-nums">{kg(q.kg, 0)}</dd><dd className="text-right font-mono text-xs tabular-nums">{pc(q.parte)}</dd>
              {e.ruedas.filter(r => r.eje === q.nombre).length > 1 && e.ruedas.filter(r => r.eje === q.nombre).map(r => (
                <Fragment key={r.nombre}><dt className="pl-3 text-slate-600">{r.nombre}</dt><dd className="text-right font-mono text-xs tabular-nums">{kg(r.kg, 0)}</dd><dd /></Fragment>
              ))}
            </Fragment>
          ))}
        </dl>
        {e.ruedas.some(r => r.kg < 0) && <p className="text-xs text-red-700">Una rueda sale con carga negativa: el centro de gravedad cae fuera de las ruedas y el vehículo volcaría parado.</p>}
        <p className="text-xs text-slate-500">{a.ruedas.length === 4
          ? 'Con cuatro ruedas el reparto depende también de los muelles: aquí todas tienen el mismo muelle y la carrocería no se dobla (una tabla rígida sobre cuatro muelles iguales). Con un muelle más duro en un eje, ese eje se lleva más. Es una estimación, no una pesada.'
          : 'Con tres ruedas el reparto sale exacto de dónde está el centro de gravedad (tres apoyos, tres ecuaciones).'} {a.estados.some(s => s.id === 'diseno') ? 'Las suspensiones, los frenos y los neumáticos se dimensionan con la «Masa de diseño»: todos a bordo y el equipaje.' : ''}</p>
      </Bloque>

      <Bloque titulo="Por qué importa" nota="en palabras">
        <div className="flex flex-col gap-2 text-xs text-slate-600">
          <p><b>Altura: el vuelco.</b> En una curva la fuerza que empuja hacia fuera actúa en el centro de gravedad; cuanto más alto, más palanca tiene para tumbar el vehículo sobre las ruedas de fuera. El umbral de vuelco va como la vía partida por el doble de la altura: {vuelco ? <>ahora {fmt(vuelco.ssf)} g con todos a bordo ({fmt(vuelco.ssfSolo)} g con el piloto solo); si el centro de gravedad bajara 5 cm sería {fmt(bajar(0.05)!)} g, y 10 cm, {fmt(bajar(0.10)!)} g. Sus neumáticos agarran unos {fmt(vuelco.agarre)} g en seco (con su tipo y construcción, en «Ejes y ruedas»): por debajo de eso el vehículo vuelca antes de derrapar, y se pide {fmt(vuelco.objetivo)} g porque el cálculo es de un sólido rígido.</> : 'este vehículo tiene su propio cálculo en Rodaje.'}</p>
          <p><b>Adelante o atrás: vuelco, frenada y tracción.</b> {a.ruedas.some(r => r.eje === 'Morro')
            ? 'En rombo el vehículo vuelca sobre el lado que va de una rueda lateral a la del morro o a la de la cola: lo mejor es tener el centro de gravedad cerca de la línea de las laterales, que es donde el rombo es más ancho.'
            : a.ruedas.filter(r => r.eje === 'Eje trasero').length === 1
              ? 'Con dos ruedas delante y una detrás, cuanto más peso delante más difícil es volcar (el triángulo de las ruedas es más ancho allí); pero la rueda de atrás es la que empuja, y con poco peso encima patina en una cuesta mojada.'
              : 'Con dos ejes, el vuelco depende sobre todo de la vía y de la altura; el reparto decide cuánto agarra cada eje al frenar y al empujar.'} Al frenar, el peso se va hacia delante (la altura hace de palanca): si el centro de gravedad está alto y muy adelantado, las ruedas de atrás se levantan. La comprobación «Reparto» busca, a esta altura, entre qué porcentajes se cumplen las tres: no volcar por debajo de {vuelco ? fmt(vuelco.objetivo) : '1,05'} g, frenar a {fmt(FRENADA, 1)} g sin levantar las de atrás, y subir una cuesta del {Math.round(CUESTA * 100)} % en mojado (agarre {fmt(AGARRE_MOJADO, 1)}).</p>
          <p><b>De lado.</b> Con el centro de gravedad fuera del centro, el vehículo vuelca antes hacia ese lado y tira hacia él al frenar. Lo normal es que quede a menos de 2 cm.</p>
          {hibrido && <p><b>El motor de gasolina y el depósito.</b> Pesan {kg(hibrido.kgMotor, 0)} y {kg(hibrido.kgDeposito, 0)} (lleno): bajar el motor 10 cm baja el centro de gravedad {cm(0.10 * hibrido.kgMotor / oc.cg.masa, 1)}, y el depósito, {cm(0.10 * hibrido.kgDeposito / oc.cg.masa, 1)}. Lo que más mueve el centro de gravedad es lo que más pesa: los ocupantes, la batería y la carrocería (abajo, «Lo que más lo sube»).</p>}
        </div>
      </Bloque>

      <Bloque titulo="Comprobaciones de masas" nota={malas ? `${malas} por revisar` : 'todo bien'}>
        <ListaComprobaciones lista={checks} />
      </Bloque>

      <Bloque titulo="Lo que más lo sube" nota="con todos a bordo">
        <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-1 text-[13px]">
          <dt className="text-[11px] text-slate-400">pieza (altura de su centro)</dt><dd className="text-right text-[11px] text-slate-400">masa</dd><dd className="text-right text-[11px] text-slate-400">sube el CdG</dd>
          {sube.map(({ p, d }) => (<Fragment key={p.nombre}><dt className="text-slate-600">{p.nombre} <span className="text-slate-400">({cm(p.y)})</span></dt><dd className="text-right font-mono text-xs tabular-nums">{kg(p.kg, 0)}</dd><dd className="text-right font-mono text-xs tabular-nums">+{cm(d, 1)}</dd></Fragment>))}
        </dl>
        <p className="text-xs text-slate-500">Cuánto más alto está el centro de gravedad por cada pieza que va por encima de él, comparado con tenerla a su misma altura (masa × diferencia de altura ÷ masa total). Bajar las de arriba de esta lista es lo que más baja el centro de gravedad.</p>
      </Bloque>

      <Bloque titulo="Peso: todos los componentes" nota={`${kg(vacio.cg.masa, 0)} en vacío`}>
        <ListaPiezas lista={a.lista.filter(p => p.grupo !== 'ocupantes')} />
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-t-2 border-slate-300 pt-1.5 text-[13px]">
          {a.estados.map(s => (<Fragment key={s.id}><dt className={cn(s.id === 'vacio' ? 'font-semibold text-slate-800' : 'text-slate-600')}>{s.id === 'vacio' ? 'Total en vacío' : s.nombre}</dt><dd className={cn('text-right font-mono text-xs tabular-nums', s.id === 'vacio' && 'font-semibold')}>{kg(s.cg.masa, s.id === 'vacio' ? 1 : 0)}</dd></Fragment>))}
        </dl>
        <p className="text-xs text-slate-500">{notaEstimacion}</p>
      </Bloque>
    </>
  );
}

/** The parts by department, each with its note (what it is made of, or why it weighs that). */
function ListaPiezas({ lista }: { lista: Masa[] }) {
  return (
    <div className="flex flex-col gap-2.5 text-[13px]">
      {GRUPOS.map(([g, n]) => {
        const ps = lista.filter(p => (p.grupo ?? 'carroceria') === g); if (!ps.length) return null;
        return (
          <div key={g}>
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-0.5 font-semibold text-slate-800"><span>{n}</span><span className="font-mono text-xs tabular-nums">{fmt(ps.reduce((s, p) => s + p.kg, 0), 1)} kg</span></div>
            <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
              {ps.map(p => (<Fragment key={p.nombre}><dt className="min-w-0 text-slate-600">{p.nombre}{p.nota && <span className="block text-[11px] leading-snug text-slate-400">{p.nota}</span>}</dt><dd className="text-right font-mono text-xs tabular-nums">{fmt(p.kg, 1)} kg</dd></Fragment>))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
