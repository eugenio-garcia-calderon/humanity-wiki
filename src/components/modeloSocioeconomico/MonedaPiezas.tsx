// Interactive pieces of the «Moneda» part: the CPI chart, the savings calculator,
// the debt-debasement simulator and the debt-sustainability simulator.
// Data and formulas: src/data/moneda.ts.
import { useState, type ReactNode } from 'react';
import { numero, porcentaje } from '../../data/modeloSocioeconomico';
import { DEUDA_PCT } from '../../data/deuda';
import { FMI_SORPRESA, FUENTES_MONEDA, IPC_ANUAL, IPC_ULTIMO, IPC_PICO, licuar, trayectoria } from '../../data/moneda';
import { Cifra } from './ventanas';
import { Fuente, Regulador, Segmentado } from './piezas';

/** A «fuente» link from this part's own source list. */
export function F({ id }: { id: string }) {
  const f = FUENTES_MONEDA[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

/** A link to another section or part, inside the page. */
export function Ir({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900">{children}</a>;
}

/** CPI annual averages 2021–2025, plus the latest month (a different measure, drawn apart). */
export function GraficaIPC() {
  const barras = [...IPC_ANUAL.map(a => ({ t: String(a.ano), v: a.v, ultimo: false })), { t: 'oct. 2026', v: IPC_ULTIMO.v, ultimo: true }];
  const W = 420, H = 230, m = { l: 34, r: 4, t: 22, b: 30 };
  const max = 10;
  const ancho = (W - m.l - m.r) / barras.length;
  const y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b);
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">Cuánto subieron los precios en España</figcaption>
      <p className="mt-1 text-sm text-slate-600">Media de cada año, y el último mes conocido comparado con el mismo mes del año anterior.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full max-w-2xl" role="img"
        aria-label={barras.map(b => `${b.t}: ${numero(b.v, 1)} %`).join('; ') + `. Objetivo del Banco Central Europeo: 2 %.`}>
        {[0, 2, 4, 6, 8, 10].map(v => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="stroke-slate-100" />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{v} %</text>
          </g>
        ))}
        {barras.map((b, k) => (
          <g key={b.t}>
            <rect x={m.l + k * ancho + ancho * 0.18} y={y(b.v)} width={ancho * 0.64} height={y(0) - y(b.v)} rx={3}
              className={b.ultimo ? 'fill-rose-300' : b.v > 5 ? 'fill-rose-700' : 'fill-slate-500'} />
            <text x={m.l + k * ancho + ancho / 2} y={y(b.v) - 6} textAnchor="middle" className="fill-slate-800 text-[12px] font-semibold">{numero(b.v, 1)}</text>
            <text x={m.l + k * ancho + ancho / 2} y={H - 10} textAnchor="middle" className="fill-slate-500 text-[11px]">{b.t}</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={y(2)} y2={y(2)} className="stroke-emerald-700" strokeDasharray="5 4" strokeWidth={1.5} />
      </svg>
      <p className="mt-2 flex items-center gap-2 text-sm text-emerald-800">
        <span aria-hidden className="inline-block w-6 border-t-2 border-dashed border-emerald-700" />Objetivo del Banco Central Europeo: 2 % al año
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Medias anuales del IPC del INE<F id="ipc-medias" /><F id="ine-2025" />. La barra clara es otra medida: octubre de 2026 frente a octubre de 2025<F id={IPC_ULTIMO.fuente} />. El mes más alto fue {IPC_PICO.mes}, con un {porcentaje(IPC_PICO.v, 1)}<F id={IPC_PICO.fuente} />.
      </p>
    </figure>
  );
}

/** What savings left in an account lose with a given inflation. */
export function Ahorros() {
  const [inflacion, setInflacion] = useState(3);
  const [anos, setAnos] = useState(10);
  const ahorro = 10_000;
  const real = ahorro / Math.pow(1 + inflacion / 100, anos);
  return (
    <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <p className="font-semibold text-slate-900">Tienes 10.000 € guardados en la cuenta, sin intereses</p>
        <Regulador etiqueta="Subida de los precios cada año" valor={inflacion} min={0} max={10} paso={0.5}
          mostrar={porcentaje(inflacion, 1)} onChange={setInflacion} ayuda="El objetivo del BCE es el 2 %. En 2022 fue un 8,4 %." />
        <Regulador etiqueta="Años" valor={anos} min={1} max={30} paso={1} mostrar={`${anos} ${anos === 1 ? 'año' : 'años'}`} onChange={setAnos} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Cifra valor={`${numero(real)} €`} texto={`es lo que podrás comprar con tus 10.000 € dentro de ${anos} ${anos === 1 ? 'año' : 'años'}, en precios de hoy`} tono={real < ahorro ? 'mal' : 'neutro'} />
        <Cifra valor={`${numero(ahorro - real)} €`} texto="de poder de compra perdidos sin gastar nada" tono={real < ahorro ? 'mal' : 'neutro'} nota="Cálculo propio: la misma subida todos los años." />
      </div>
    </div>
  );
}

/** Unexpected inflation and the debt ratio: d / (1 + π). */
export function SimuladorLicuacion() {
  const [base, setBase] = useState<'ejemplo' | 'espana'>('ejemplo');
  const [inflacion, setInflacion] = useState(10);
  const d0 = base === 'ejemplo' ? 100 : DEUDA_PCT.total;
  const d1 = licuar(d0, inflacion);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="font-semibold text-slate-900">Prueba: una inflación que nadie esperaba</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmentado<'ejemplo' | 'espana'> etiqueta="Deuda de partida" valor={base} onChange={setBase}
          opciones={[{ id: 'ejemplo', texto: 'Ejemplo: 100 % del PIB' }, { id: 'espana', texto: `España 2025: ${porcentaje(DEUDA_PCT.total, 1)}` }]} />
      </div>
      <div className="mt-4 max-w-xl">
        <Regulador etiqueta="Inflación por sorpresa en un año" valor={inflacion} min={0} max={20} paso={1}
          mostrar={porcentaje(inflacion, 0)} onChange={setInflacion} />
      </div>
      <div className="mt-4 max-w-2xl space-y-2" role="img"
        aria-label={`Deuda antes: ${numero(d0, 1)} % del PIB. Después de una inflación por sorpresa del ${inflacion} %: ${numero(d1, 1)} % del PIB.`}>
        {[{ t: 'Antes', v: d0, c: 'bg-slate-500' }, { t: 'Después', v: d1, c: 'bg-emerald-700' }].map(b => (
          <div key={b.t} className="grid grid-cols-[64px_1fr] items-center gap-2">
            <span className="text-sm text-slate-600">{b.t}</span>
            <span className="flex items-center gap-2">
              <span className={`h-6 shrink-0 rounded-r-[4px] ${b.c}`} style={{ width: `${(b.v / 110) * 75}%` }} />
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">{numero(b.v, 1)} %</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        La deuda sigue siendo la misma cantidad de euros, pero todo lo que el país produce cuesta un {inflacion} % más. Pesa <strong>{numero(d0 - d1, 1)} puntos menos</strong> sin haber devuelto un euro.
        Si la inflación ya se esperaba, este efecto desaparece: quien presta habría pedido más interés para compensar.
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
        Es la cuenta mecánica, con todo lo demás igual. En la realidad el efecto es mucho menor: el FMI calcula que un punto de inflación por sorpresa baja la deuda unos {numero(FMI_SORPRESA, 1)} puntos con el tiempo, en países que deben más del 50 % del PIB, porque suben los intereses y los gastos que se actualizan con los precios<F id="fmi-2023" />.
      </p>
    </div>
  );
}

/** Debt ratio over ten years from Δd ≈ (i − g)·d − s. */
export function SimuladorSostenibilidad() {
  const [i, setI] = useState(1.5);
  const [g, setG] = useState(1.5);
  const [s, setS] = useState(0);
  const d0 = DEUDA_PCT.total;
  const serie = trayectoria(d0, i, g, s);
  const fin = serie[serie.length - 1];
  const W = 380, H = 230, m = { l: 38, r: 6, t: 18, b: 28 };
  const top = Math.max(160, Math.ceil(Math.max(...serie) / 20) * 20);
  const x = (k: number) => m.l + (k / 10) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v / top) * (H - m.t - m.b);
  const sube = fin > d0 + 0.05;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-5">
          <Regulador etiqueta="Interés que se paga, descontada la inflación" valor={i} min={-2} max={6} paso={0.5}
            mostrar={porcentaje(i, 1)} onChange={setI} ayuda="Lo que de verdad cuesta deber, por encima de la subida de los precios." />
          <Regulador etiqueta="Crecimiento de la economía, descontada la inflación" valor={g} min={-2} max={5} paso={0.5}
            mostrar={porcentaje(g, 1)} onChange={setG} ayuda="Cuánto más produce el país cada año." />
          <Regulador etiqueta="Lo que sobra cada año antes de pagar intereses (% del PIB)" valor={s} min={-4} max={4} paso={0.5}
            mostrar={porcentaje(s, 1)} onChange={setS} ayuda="Ingresos menos gastos sin contar intereses. En negativo, falta dinero (déficit)." />
          <p className="text-xs text-slate-500">Los valores de partida son un ejemplo, no una previsión. Se parte de la deuda de España a finales de 2025<Fuente id="deuda-2025" />.</p>
        </div>
        <figure>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
            aria-label={`Deuda sobre el PIB en diez años: de ${numero(d0, 1)} % a ${numero(fin, 1)} %.`}>
            {[0, 40, 80, 120, 160, 200, 240, 280].filter(v => v <= top).map(v => (
              <g key={v}>
                <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="stroke-slate-100" />
                <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{v} %</text>
              </g>
            ))}
            <line x1={m.l} x2={W - m.r} y1={y(60)} y2={y(60)} className="stroke-slate-300" strokeDasharray="4 4" />
            <text x={W - m.r} y={y(60) - 5} textAnchor="end" className="fill-slate-500 text-[11px]">límite europeo, 60 %</text>
            <polyline points={serie.map((v, k) => `${x(k)},${y(v)}`).join(' ')} fill="none"
              className={sube ? 'stroke-rose-700' : 'stroke-emerald-700'} strokeWidth={2.5} strokeLinejoin="round" />
            {[0, 10].map(k => (
              <text key={k} x={x(k)} y={y(serie[k]) - 9} textAnchor={k === 0 ? 'start' : 'end'} className="fill-slate-900 text-[12px] font-semibold">{numero(serie[k], 0)} %</text>
            ))}
            {[0, 5, 10].map(k => <text key={k} x={x(k)} y={H - 8} textAnchor={k === 0 ? 'start' : k === 10 ? 'end' : 'middle'} className="fill-slate-500 text-[11px]">{k === 0 ? 'hoy' : `año ${k}`}</text>)}
          </svg>
          <figcaption className="mt-2 text-[15px] leading-relaxed text-slate-700">
            En diez años la deuda pasaría del {porcentaje(d0, 1)} al <strong className={sube ? 'text-rose-700' : 'text-emerald-800'}>{porcentaje(fin, 1)}</strong> del PIB.{' '}
            {i > g ? 'El interés supera al crecimiento: la deuda tiende a crecer sola, y hace falta que sobre dinero cada año para frenarla.'
              : i < g ? 'El crecimiento supera al interés: la deuda pesa cada vez menos, salvo que falte mucho dinero cada año.'
                : 'Interés y crecimiento empatan: decide lo que sobre o falte cada año.'}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
