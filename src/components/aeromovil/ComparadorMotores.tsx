/**
 * Choosing the petrol engine and the electric motor side by side (2026-11-17, Eugenio: «quiero que la elección pueda
 * tomarse de manera mucho más consciente, sabiendo qué potencia y qué peso y qué cilindrada y qué consumo tienen cada
 * uno de los motores que se propone y qué coste estimado también, para poder tomar una decisión coherente»).
 *
 * One table per block («Motor gasolina», «Motor eléctrico»): every part of the catalogue (catalogoTren.ts) with its
 * published figures, what this car would burn or spend with it (the model's own `energiaTriciclo`, run on a copy of
 * the design with that part in it), and one shop's price. Clicking a row chooses it, exactly as the «modelo
 * comercial» selector does (the page's `elegirCatalogo`). Above the table, «Cuál te conviene»: the power this car
 * needs at 90 km/h with this tunnel CdA and this mass, and which parts give it.
 */
import { Fragment, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn';
import { A_MEDIDA, EUR_POR_USD, MOTORES, TERMICOS, bsfc, cv, precioEuros, rendimientoTermico, type Precio } from './catalogoTren';
import { AUXILIARES, RENDIMIENTO, energiaTriciclo, type ModeloTriciclo } from './geometriaTriciclo';
import type { PartePeso } from './masasSecciones';

/** The speed the table compares at (Eugenio: a car for 80–90 km/h). */
export const VEL_COMPARAR = 90;
/** The slope the «cuál te conviene» hint adds at that speed: 3 %, a motorway's usual maximum is 4–5 %. */
const CUESTA = 0.03;
/** Controller efficiency assumed when a motor's maker publishes the motor's own (the model's 85 % is both together). */
const REND_CONTROLADOR = 0.97;

const f = (v: number, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const euros = (p: Precio | null | undefined, n = 1) => { const e = precioEuros(p); return e == null ? null : `${p!.moneda === 'USD' ? '≈ ' : ''}${f(Math.round(e * n / 10) * 10)} €`; };

interface Fila {
  id: string; nombre: string; ejemplo?: string;
  celdas: (string | null)[];
  /** gives what the car needs (with the slope), or null when unknown */
  basta: boolean | null;
  /** its consumption uses the maker's published figure (false: the slider's, marked *) */
  consumoPublicado?: boolean;
  precio: Precio | null | undefined; n: number;
}

function Tabla({ cabeceras, filas, actual, alElegir, notaPie }: { cabeceras: string[]; filas: Fila[]; actual: string; alElegir: (id: string) => void; notaPie: string }) {
  return (
    <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[34rem] border-collapse text-[11px] tabular-nums">
        <thead className="bg-slate-50 text-slate-500">
          <tr>{cabeceras.map((c, i) => <th key={c} scope="col" className={cn('px-1.5 py-1 font-semibold leading-tight', i === 0 ? 'sticky left-0 bg-slate-50 text-left' : 'text-right')}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map(r => {
            const es = r.id === actual;
            return (
              <tr key={r.id} className={cn('border-t border-slate-100', es ? 'bg-emerald-50' : 'hover:bg-slate-50')}>
                <th scope="row" className={cn('sticky left-0 max-w-[11rem] px-1.5 py-1 text-left font-normal', es ? 'bg-emerald-50' : 'bg-white')}>
                  <button type="button" onClick={() => alElegir(r.id)} aria-pressed={es} className={cn('w-full text-left leading-tight hover:text-teal-800', es ? 'font-semibold text-emerald-900' : 'text-slate-800')}>
                    {es ? '● ' : '○ '}{r.nombre}
                    {r.basta === false && <span className="block text-[10px] font-normal text-amber-700">se queda corto</span>}
                  </button>
                </th>
                {r.celdas.map((c, i) => <td key={i} className={cn('whitespace-nowrap px-1.5 py-1 text-right font-mono', c == null ? 'text-slate-300' : 'text-slate-800')}>{c ?? '—'}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-2 py-1 text-[10.5px] leading-snug text-slate-500">{notaPie}</p>
    </div>
  );
}

/** The shops the prices were read from, one line each. */
function Fuentes({ filas }: { filas: Fila[] }) {
  const con = filas.filter(r => r.precio);
  return (
    <details className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600">
      <summary className="cursor-pointer font-semibold text-slate-700">De dónde salen los precios</summary>
      <ul className="mt-1 flex flex-col gap-0.5">
        {con.map(r => (
          <li key={r.id}>
            <a href={r.precio!.fuente} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-800 underline decoration-dotted underline-offset-2"><ExternalLink className="h-3 w-3" />{r.nombre}</a>
            {': '}{f(r.precio!.valor, r.precio!.valor % 1 ? 2 : 0)} {r.precio!.moneda === 'EUR' ? '€' : '$'}{r.n > 1 ? ' cada uno' : ''}, IVA {r.precio!.iva}{r.precio!.nota ? `; ${r.precio!.nota}` : ''} (leído el {r.precio!.leido.split('-').reverse().join('/')})
          </li>
        ))}
      </ul>
      <p className="mt-1 text-slate-500">Un precio de una tienda, nuevo, el día que se leyó: orientativo. Cambia cada semana y de una tienda a otra; los dólares, a {f(EUR_POR_USD, 2)} € por dólar (aproximado). Sin precio: el fabricante no lo publica (vende bajo pedido) o no se encontró en una tienda.</p>
    </details>
  );
}

export function ComparadorMotores({ tipo, modelo, mTot, cd, actual, alElegir, motores, partes }: {
  tipo: 'gasolina' | 'electrico'; modelo: ModeloTriciclo; mTot: number;
  /** the tunnel's figures, or null while it computes */
  cd: { cd: number; areaRef: number } | null;
  actual: string | undefined; alElegir: (id: string) => void;
  /** how many hub motors (two with two rear wheels) */
  motores: 1 | 2;
  /** the block's parts with their masses (its section in masasSecciones.ts: the same as its header's weight) */
  partes: PartePeso[];
}) {
  const T = modelo.campos, id = actual ?? A_MEDIDA, p = modelo.phev;
  // 2026-11-17: the traction motor central, MG2 on the planetary's ring (hibrido.ts): only central motors fit there, one of them
  const central = modelo.motor.tipo === 'central';
  // the car at the comparison speed: the same model, only «Velocidad de cálculo» moved
  const a90 = useMemo(() => ({ ...modelo, campos: { ...modelo.campos, tVel: VEL_COMPARAR } }) as ModeloTriciclo, [modelo]);
  const base = useMemo(() => (cd ? energiaTriciclo(a90, mTot, cd) : null), [a90, mTot, cd]);
  const v = VEL_COMPARAR / 3.6;
  // what the wheels ask at 90 km/h (W), flat and on the slope
  const rueda = base ? (base.potencia - AUXILIARES) * RENDIMIENTO * modelo.motor.rend : null;
  const cuesta = mTot * 9.81 * CUESTA * v;

  const enCoche = partes;
  const kgCoche = enCoche.reduce((a, x) => a + x.kg, 0);

  const datos = useMemo(() => {
    if (tipo === 'gasolina') {
      if (!p) return null;
      const kgAhora = p.kgMotor;
      // the engine has to give, at its shaft, what the wheels ask through the hybrid's connection, plus the equipment
      const pideLlano = rueda != null ? (rueda / p.rendTrans + AUXILIARES) / 1000 : null;
      const pideCuesta = rueda != null ? ((rueda + cuesta) / p.rendTrans + AUXILIARES) / 1000 : null;
      const filas: Fila[] = TERMICOS.map(t => {
        const rend = rendimientoTermico(t), b = bsfc(t);
        const e = cd ? energiaTriciclo({ ...a90, phev: { ...p, kW: t.kW, rendTerm: rend != null ? rend / 100 : p.rendTerm } } as ModeloTriciclo, mTot + (t.kg ?? kgAhora) - kgAhora, cd) : null;
        const kWUso = t.kWCont ?? t.kW;
        return {
          id: t.id, nombre: `${t.marca} ${t.modelo}`, precio: t.precio, n: 1, consumoPublicado: rend != null,
          basta: pideCuesta != null ? kWUso >= pideCuesta : null,
          celdas: [
            t.cc != null ? `${f(t.cc)}` : null,
            `${f(t.kW, 1)} · ${f(cv(t.kW))}`,
            t.kWCont != null ? f(t.kWCont, 1) : null,
            t.nm != null ? f(t.nm, 0) : null,
            t.kg != null ? f(t.kg, 1) : null,
            b != null ? f(b) : null,
            e?.hibrido ? `${f(e.hibrido.litros100, 2)}${rend == null ? '*' : ''}` : null,
            e?.hibrido ? f(e.hibrido.vmaxGasolina) : null,
            euros(t.precio),
          ],
        };
      });
      return { filas, pideLlano, pideCuesta };
    }
    const kgAhora = T.tMMotor;
    const pideLlano = rueda != null ? rueda / 1000 : null, pideCuesta = rueda != null ? (rueda + cuesta) / 1000 : null;
    const filas: Fila[] = MOTORES.filter(m => !central || m.montaje === 'central').map(m => {
      const n = m.montaje === 'buje' && !central ? motores : 1;
      const kg = m.kg != null ? m.kg * n : null;
      const e = cd ? energiaTriciclo(a90, mTot + (kg ?? kgAhora) - kgAhora, cd) : null;
      // with the maker's efficiency: the wheels' power over the motor's and an assumed controller's
      const P = e ? (m.rendimiento != null ? (e.potencia - AUXILIARES) * RENDIMIENTO / (m.rendimiento / 100 * REND_CONTROLADOR) + AUXILIARES : e.potencia) : null;
      const whKm = P != null ? P / v / 3.6 : null;
      const kWCont = m.kWCont != null ? m.kWCont * n : null;
      return {
        id: m.id, nombre: `${m.marca} ${m.modelo}`, precio: m.precio, n, consumoPublicado: m.rendimiento != null,
        basta: kWCont != null && pideCuesta != null ? kWCont >= pideCuesta : null,
        celdas: [
          `${m.montaje === 'buje' ? 'buje' : 'central'}${n > 1 ? ' ×2' : ''}`,
          m.vNom != null ? `${m.vNom}` : m.vMin != null || m.vMax != null ? `${m.vMin ?? '?'}–${m.vMax ?? '?'}` : null,
          kWCont != null ? `${f(kWCont, 1)} · ${f(cv(kWCont))}` : null,
          m.kWPico != null ? f(m.kWPico * n, 0) : null,
          m.nmPico != null ? f(m.nmPico * n, 0) : null,
          kg != null ? f(kg, 1) : null,
          m.rendimiento != null ? f(m.rendimiento) : null,
          whKm != null ? `${f(whKm)}${m.rendimiento == null ? '*' : ''}` : null,
          euros(m.precio, n),
        ],
      };
    });
    return { filas, pideLlano, pideCuesta };
  }, [tipo, p, rueda, cuesta, cd, a90, mTot, T.tMMotor, motores, central]);

  if (!datos) return null;
  const { filas, pideLlano, pideCuesta } = datos;
  // «A medida» first, with the sliders' figures when it is the choice
  const medida: Fila = { id: A_MEDIDA, nombre: 'A medida (deslizadores)', precio: null, n: 1, basta: null, celdas: filas[0].celdas.map(() => null) };
  if (id === A_MEDIDA) {
    if (tipo === 'gasolina' && p) medida.celdas = [`≈ ${f(Math.round(p.disp.motor.cc / 10) * 10)}`, `${f(p.kW, 1)} · ${f(cv(p.kW))}`, null, null, f(p.kgMotor, 1), f(745 / (p.rendTerm * 8.9)), base?.hibrido ? f(base.hibrido.litros100, 2) : null, base?.hibrido ? f(base.hibrido.vmaxGasolina) : null, null];
    if (tipo === 'electrico') medida.celdas = [central ? 'central' : 'buje', null, `${f(T.tKWNom, 1)} · ${f(cv(T.tKWNom))}`, f(T.tKWPico, 0), null, f(T.tMMotor, 1), f(RENDIMIENTO * 100), base ? f(base.WhKm) : null, null];
  }
  const todas = [medida, ...filas];
  const sirven = filas.filter(r => r.basta);
  const num = (r: Fila, i: number) => { const c = r.celdas[i]; return c == null ? Infinity : Number(c.replace(/[^\d,]/g, '').replace(',', '.')); };
  const iCons = tipo === 'gasolina' ? 6 : 7, iKg = tipo === 'gasolina' ? 4 : 5;
  const masLigero = [...sirven].sort((a, b) => num(a, iKg) - num(b, iKg))[0];
  // (only among those whose consumption is their maker's: the others carry the slider's efficiency, not theirs)
  const menosGasta = [...sirven].filter(r => r.consumoPublicado).sort((a, b) => num(a, iCons) - num(b, iCons))[0];
  const masBarato = [...sirven].filter(r => precioEuros(r.precio) != null).sort((a, b) => precioEuros(a.precio)! * a.n - precioEuros(b.precio)! * b.n)[0];

  const cab = tipo === 'gasolina'
    ? ['Motor de gasolina', 'cm³', 'kW · CV máx.', 'kW cont.', 'N·m', 'kg seco', 'g/kWh', `L/100 km a ${VEL_COMPARAR}`, 'km/h solo gasolina', 'Precio']
    : ['Motor eléctrico', 'Tipo', 'V', 'kW · CV cont.', 'kW pico', 'N·m pico', 'kg', 'η %', `Wh/km a ${VEL_COMPARAR}`, 'Precio'];
  const pie = tipo === 'gasolina'
    ? `Potencia, cilindrada, par, masa y consumo: los que publica cada fabricante o vendedor (ficha enlazada al elegirlo). g/kWh: gramos de gasolina por kWh en el eje, de su consumo publicado a su potencia continua; cuanto menos, mejor. L/100 km: este coche a ${VEL_COMPARAR} km/h con la batería gastada, con su Cd del túnel, su unión al híbrido (${f(p!.rendTrans * 100)} %) y la masa de ese motor (el cálculo de «Rendimiento»); * sin consumo publicado: con el rendimiento del deslizador. km/h solo gasolina: lo que sostiene en llano con su potencia máxima. Estimaciones, no medidas.`
    : `${central ? 'Solo motores centrales: el motor eléctrico va junto al de gasolina, en la corona del planetario (MG2), y llega a las ruedas por la cadena. ' : ''}Potencias, par, tensión y masa: los que publica cada fabricante o vendedor (ficha enlazada al elegirlo); «×2»: dos motores de buje, uno por rueda trasera, y las cifras son de los dos. Wh/km: este coche a ${VEL_COMPARAR} km/h con su Cd del túnel y la masa de ese motor; con el rendimiento que publica el fabricante (η) y un controlador al ${f(REND_CONTROLADOR * 100)} %; * sin rendimiento publicado: motor y controlador al ${f(RENDIMIENTO * 100)} %, como en «Rendimiento». Estimaciones, no medidas.`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2 text-[12px] leading-snug text-slate-700">
        <p className="font-semibold text-slate-900">Cuál te conviene</p>
        {pideLlano == null || pideCuesta == null
          ? <p>El túnel está calculando el Cd de esta forma: en unos segundos sale cuánta potencia pide el coche.</p>
          : <>
            <p>Con su CdA del túnel ({f(base!.CdA, 3)} m²) y {f(mTot)} kg con los ocupantes, a {VEL_COMPARAR} km/h este coche pide <b>{f(pideLlano, 1)} kW</b> {tipo === 'gasolina' ? 'al motor de gasolina en llano (con la unión al híbrido y los equipos)' : 'en la rueda en llano'}, y <b>{f(pideCuesta, 1)} kW</b> subiendo una cuesta del {f(CUESTA * 100)} %. {tipo === 'gasolina' ? 'Para viajar solo con gasolina, mejor un motor que dé eso en continuo, sin ir al máximo.' : 'Un motor que dé eso en continuo no se calienta en un viaje; para adelantar se tira del pico.'}</p>
            {sirven.length
              ? <p>Lo dan {sirven.length} de {filas.length} (en continuo; los que no publican la continua, a su potencia máxima). {masLigero && <>El más ligero: <b>{masLigero.nombre}</b>. </>}{menosGasta && menosGasta !== masLigero && <>El que menos gasta (con consumo publicado): <b>{menosGasta.nombre}</b>. </>}{masBarato && masBarato !== masLigero && masBarato !== menosGasta && <>El más barato con precio publicado: <b>{masBarato.nombre}</b>. </>}Más potencia que eso es más masa y más dinero sin ir más rápido.</p>
              : <p>Ninguno del catálogo lo da en continuo según lo que publica: los de potencia continua sin publicar no se cuentan.</p>}
          </>}
      </div>
      <Tabla cabeceras={cab} filas={todas} actual={id} alElegir={alElegir} notaPie={pie} />
      {kgCoche > 0 && (
        <p className="text-[11.5px] text-slate-600">En el coche ahora: {enCoche.map((x, i) => <Fragment key={x.nombre}>{i ? ' + ' : ''}{x.nombre.replace(/^Motor: /, '')} {f(x.kg, 1)} kg</Fragment>)} = <b>{f(kgCoche, 1)} kg</b>{tipo === 'gasolina' ? ' (la masa del motor es la de su ficha, en seco; la unión y el depósito, estimados)' : ''}.</p>
      )}
      <Fuentes filas={filas} />
    </div>
  );
}
