/**
 * «Batería» (was «Energía», 2026-11-17): the solar and charging system, part by part (sistema.ts), and the
 * «Consumos» tab's extra block: the consumption at the plug and the solar chain. Both read the same `sistemaElectrico`.
 */
import { Fragment } from 'react';
import { ExternalLink } from 'lucide-react';
import type { ModeloTriciclo, Resultados } from '../geometria';
import { Bloque, ListaComprobaciones, fmt } from '../controles';
import { precioEuros, type Precio } from '../catalogoTren';
import { CARGADORES, DCDCS, MPPTS, BMSS } from './catalogo';
import { litrosEquivalentes, precioSistema, sistemaElectrico, W_SCHUKO, type SistemaElectrico } from './sistema';

const textoPrecio = (p: Precio | null) => !p ? 'sin precio publicado'
  : `${p.moneda === 'EUR' ? `${fmt(p.valor, p.valor % 1 ? 2 : 0)} €` : `${fmt(p.valor, p.valor % 1 ? 2 : 0)} USD (≈ ${Math.round(precioEuros(p)!)} €)`} ${p.iva === 'incluido' ? 'con IVA' : p.iva === 'sin IVA' ? 'sin IVA' : '(IVA sin aclarar)'}`;
const esUrl = (s: string | null | undefined) => !!s && /^https?:\/\//.test(s);

/** The full list of the electrical system's parts, sized from this design, with mass, efficiency, price and source. */
export function BloqueSistemaElectrico({ modelo, res }: { modelo: ModeloTriciclo; res: Resultados }) {
  const s = sistemaElectrico(modelo, res), pr = precioSistema(s);
  const malas = s.comprobaciones.filter(c => c.holgura < c.minimo).length;
  return (
    <Bloque titulo="Sistema solar y de carga: todos los componentes" nota={`${s.componentes.length} piezas · ${malas ? `${malas} por revisar` : 'todo encaja'}`}>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-slate-600">Tensión del sistema</dt><dd className="text-right font-mono text-xs tabular-nums">{s.tension} V</dd>
        <dt className="text-slate-600">  celdas en serie ({s.quimica})</dt><dd className="text-right font-mono text-xs tabular-nums">{s.serie} · {fmt(s.vMin, 0)}–{fmt(s.vMax, 0)} V</dd>
        <dt className="text-slate-600">Corriente de batería: continua · pico</dt><dd className="text-right font-mono text-xs tabular-nums">{Math.round(s.aCont)} · {Math.round(s.aPico)} A</dd>
        <dt className="text-slate-600">Carga completa: cargador a bordo · enchufe de casa</dt><dd className="text-right font-mono text-xs tabular-nums">{s.horasCarga ? `${fmt(s.horasCarga, 1)} · ${fmt(s.horasSchuko!, 1)} h` : '—'}</dd>
        <dt className="text-slate-600">Piezas del sistema (sin motor ni paneles)</dt><dd className="text-right font-mono text-xs tabular-nums">{fmt(s.kgVariosNecesario, 1)} kg</dd>
        <dt className="text-slate-600">Precio de lo que tiene precio publicado</dt><dd className="text-right font-mono text-xs tabular-nums">≈ {Math.round(pr.eur).toLocaleString('es-ES')} €{pr.sin ? ` · ${pr.sin} sin precio` : ''}</dd>
      </dl>
      <p className="text-xs text-slate-500">La tensión es {s.origenTension}. La química sale de la densidad del paquete ({s.quimica === 'NMC' ? 'desde 170 Wh/kg solo llega el NMC' : 'por debajo de 170 Wh/kg, LFP: más segura y barata'}). Cada pieza es la primera del catálogo que encaja con este diseño; si ninguna encaja, se dice.</p>

      <ul className="flex flex-col gap-2">
        {s.componentes.map(x => (
          <li key={x.id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-slate-800">{x.funcion}{x.cantidad > 1 && x.id !== 'celulas' ? ` × ${x.cantidad}` : ''}</span>
              <span className="shrink-0 font-mono tabular-nums text-slate-700">{x.cuentaEn === 'Techo solar' ? `${x.cantidad} células` : `${fmt(x.kg, x.kg < 1 ? 2 : 1)} kg`}</span>
            </div>
            <p className={x.pieza ? 'text-slate-700' : 'font-semibold text-amber-800'}>
              {x.pieza ? `${x.pieza.marca} · ${x.pieza.modelo}` : x.cuentaEn === 'Motor' ? 'En Motor › Motor eléctrico' : 'Ninguna pieza del catálogo encaja'}
              {x.pieza && esUrl(x.pieza.fuente) && <a href={x.pieza.fuente!} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-teal-700 underline">ficha<ExternalLink className="h-3 w-3" /></a>}
            </p>
            <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-[11px]">
              {x.pieza?.rendimiento != null && <><dt className="text-slate-500">Rendimiento</dt><dd className="text-right font-mono tabular-nums">{fmt(x.pieza.rendimiento * 100, 1)} %</dd></>}
              {x.pieza && x.cuentaEn !== 'Techo solar' && <><dt className="text-slate-500">Masa{x.kgEstimado ? ' (estimada)' : ''}</dt><dd className="text-right font-mono tabular-nums">{fmt(x.kgUd, 2)} kg{x.cantidad > 1 ? ' cada uno' : ''}</dd></>}
              {x.cuentaEn !== 'Motor' && x.pieza && <><dt className="text-slate-500">Precio</dt><dd className="text-right font-mono tabular-nums">{textoPrecio(x.precio)}</dd></>}
              <dt className="text-slate-500">Cuenta en</dt><dd className="text-right">{x.cuentaEn === 'Varios' ? 'Batería › Varios' : x.cuentaEn === 'Techo solar' ? 'Batería › Techo solar' : 'Motor'}</dd>
            </dl>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{x.dimensionado}</p>
            {x.pieza?.notas && x.id !== 'fusible' && x.id !== 'precarga' && x.id !== 'desconectador' && x.id !== 'bat12' && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{x.pieza.notas}</p>}
            {x.pieza?.precio && esUrl(x.pieza.precio.fuente) && <p className="mt-0.5 text-[11px] text-slate-400">Precio leído el {x.pieza.precio.leido} en <a className="underline" href={x.pieza.precio.fuente} target="_blank" rel="noreferrer">{new URL(x.pieza.precio.fuente).hostname}</a>{x.pieza.precio.nota ? ` (${x.pieza.precio.nota})` : ''}.</p>}
          </li>
        ))}
      </ul>

      {s.solar.length > 0 && <>
        <p className="text-xs font-semibold text-slate-700">Cadenas solares (una por zona: miran a sitios distintos, así que cada una lleva su regulador)</p>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[12px]">
          {s.solar.map(z => (<Fragment key={z.zona}>
            <dt className="text-slate-600">{z.zona}: {fmt(z.area, 2)} m², {z.celulas} células{z.enSerieCon ? ` · en serie con ${z.enSerieCon.toLowerCase()}` : ''}</dt>
            <dd className="text-right font-mono text-xs tabular-nums">{Math.round(z.wpCelulas)} W placa · {Math.round(z.wpEditor)} W editor</dd>
          </Fragment>))}
        </dl>
      </>}

      <ListaComprobaciones lista={s.comprobaciones} />
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer font-semibold text-slate-600">Otras piezas del catálogo</summary>
        <ul className="mt-1 list-disc pl-4">
          {[...MPPTS, ...BMSS, ...CARGADORES, ...DCDCS].map(p => <li key={p.id}>{p.marca} {p.modelo}: {p.kg != null ? `${fmt(p.kg, 2)} kg` : 'masa sin publicar'}{p.rendimiento != null ? `, ${fmt(p.rendimiento * 100, 1)} %` : ''}; {textoPrecio(p.precio)}.{p.fuente && esUrl(p.fuente) ? <> <a className="underline" href={p.fuente} target="_blank" rel="noreferrer">ficha</a></> : null}</li>)}
        </ul>
      </details>
      <p className="text-xs text-slate-500">Las masas de estas piezas son el desglose de «Varios: cargador, cables, luces, 12 V» (abajo, en Varios): no se suman al coche, así que ningún diseño guardado cambia de peso ni de consumo. Si las piezas pesan más que «Varios», la comprobación de arriba dice cuánto subirlo. Los precios son de una tienda el día que se leyeron: un orden de magnitud, no un presupuesto.</p>
    </Bloque>
  );
}

/** The «Consumos» tab's second block: from the plug to the wheel, and the solar chain's efficiencies. */
export function BloqueDelEnchufe({ modelo, res, whKm, kmh }: { modelo: ModeloTriciclo; res: Resultados; whKm: number | null; kmh: number }) {
  const s: SistemaElectrico = sistemaElectrico(modelo, res);
  const kWh100 = whKm != null ? whKm / 10 : null, enchufe = kWh100 != null && s.rendCargador ? kWh100 / s.rendCargador : null;
  const sinCd = 'calculando…';
  return (
    <Bloque titulo="Del enchufe a la rueda" nota="estimación">
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-slate-600">Consumo a {kmh} km/h, de la batería</dt><dd className="text-right font-mono text-xs tabular-nums">{kWh100 != null ? `${fmt(kWh100, 1)} kWh/100 km` : sinCd}</dd>
        <dt className="text-slate-600">  equivale en gasolina a</dt><dd className="text-right font-mono text-xs tabular-nums">{kWh100 != null ? `${fmt(litrosEquivalentes(kWh100), 2)} L/100 km` : sinCd}</dd>
        <dt className="text-slate-600">Del enchufe (con el cargador al {s.rendCargador ? Math.round(s.rendCargador * 100) : '—'} %)</dt><dd className="text-right font-mono text-xs tabular-nums">{enchufe != null ? `${fmt(enchufe, 1)} kWh/100 km` : sinCd}</dd>
        <dt className="text-slate-600">Equipos de 12 V: de la batería · lo que llega</dt><dd className="text-right font-mono text-xs tabular-nums">80 W · {s.rendDcdc ? `${Math.round(80 * s.rendDcdc)} W (DC-DC al ${Math.round(s.rendDcdc * 100)} %)` : '—'}</dd>
        <dt className="text-slate-600">Solar: regulador MPPT · el resto de pérdidas</dt><dd className="text-right font-mono text-xs tabular-nums">{s.rendMppt ? `${fmt(s.rendMppt * 100, 1)} % · ${fmt(85 / s.rendMppt, 1)} %` : '—'}</dd>
        <dt className="text-slate-600">Carga completa: cargador a bordo · enchufe de casa ({W_SCHUKO / 1000} kW)</dt><dd className="text-right font-mono text-xs tabular-nums">{s.horasCarga ? `${fmt(s.horasCarga, 1)} · ${fmt(s.horasSchuko!, 1)} h` : '—'}</dd>
      </dl>
      <p className="text-xs text-slate-500">«Equivale en gasolina»: la misma energía en litros de gasolina (8,9 kWh por litro, su poder calorífico), no lo que gastaría un coche de gasolina, que con su motor al 25–35 % gastaría unas tres veces más. «Del enchufe» es lo que se paga: lo de la batería más lo que pierde el cargador (sin contar lo que pierde la propia batería al cargarse, un 3–5 % más). Los 80 W de equipos ya contaban en el consumo; aquí se ve cuánto llega a 12 V. La energía solar sigue con su 85 % de pérdidas de siempre: el regulador es una parte de ellas y el resto es calor, cableado y desajuste entre células. Nada de esto cambia las cifras de consumo y autonomía de antes.</p>
    </Bloque>
  );
}

/**
 * The line under the «Consumos» tab: litres per 100 km. A plug-in hybrid's petrol figure (battery spent); a pure
 * electric's kWh/100 km and the petrol with the same energy, marked «≈».
 */
export function textoConsumoPestana(e: { WhKm: number; hibrido: { litros100: number } | null } | null): { lineas: string[]; largo: string } | null {
  if (!e || !Number.isFinite(e.WhKm)) return null;
  if (e.hibrido) return { lineas: [`${fmt(e.hibrido.litros100, 1)} L/100`], largo: `${fmt(e.hibrido.litros100, 2)} L/100 km de gasolina con la batería gastada; ${fmt(e.WhKm / 10, 1)} kWh/100 km con la batería` };
  const k = e.WhKm / 10, l = litrosEquivalentes(k);
  return { lineas: [`≈${fmt(l, 1)} L/100`, `${fmt(k, 1)} kWh`], largo: `${fmt(k, 1)} kWh/100 km de electricidad ≈ ${fmt(l, 2)} L/100 km de gasolina en energía equivalente (8,9 kWh por litro)` };
}
