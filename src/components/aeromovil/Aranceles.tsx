// ============================================================================
// AEROMÓVIL 1 · /aeromovil/aranceles: importar de China (2026-11-08)
// ============================================================================
// The data and the arithmetic live in `aranceles.ts`; this file only lays them
// out. Every figure on the page is computed from there, so a rate or an
// estimate changes in one place.
import { useMemo } from 'react';
import { AlertTriangle, ExternalLink, Ship } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Modelo, Parametros, Resultados } from './geometria';
import { ARANCEL_COCHE, COMPENSATORIO_COOPERANTES, COMPENSATORIO_RESTO, ESPECIALES, FUENTES, IVA, SUPUESTOS, calcularAranceles, type Escenario, type FilaPieza } from './aranceles';

const eur = (v: number) => `${Math.round(v).toLocaleString('es-ES')} €`;
const pct = (v: number, d = 1) => `${(v * 100).toLocaleString('es-ES', { minimumFractionDigits: v === 0 ? 0 : d, maximumFractionDigits: d })} %`;

function Seccion({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white', className)}>
      <h3 className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</h3>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Resumen({ titulo, e, detalle, destacado }: { titulo: string; e: Escenario; detalle: string; destacado?: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-white px-4 py-3', destacado ? 'border-teal-300' : 'border-slate-200')}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums text-slate-900">{eur(e.derechos)}</p>
      <p className="text-xs text-slate-600">de derechos de aduana: {pct(e.derechos / e.aduana)} de lo que vale lo que llega ({eur(e.aduana)})</p>
      <p className="mt-1 text-xs text-slate-500">{detalle}</p>
      <p className="mt-2 border-t border-slate-100 pt-1.5 text-xs text-slate-600">Y aparte, IVA de importación: <span className="font-mono tabular-nums text-slate-900">{eur(e.iva)}</span></p>
    </div>
  );
}

/** One piece and the lines it is declared under. */
function FilasPieza({ f, soloIva }: { f: FilaPieza; soloIva?: boolean }) {
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-50/70 align-top">
        <td className="py-1.5 pl-2 pr-2">
          <span className="block text-sm font-medium text-slate-900">{f.nombre}</span>
          <span className="block text-[11px] leading-snug text-slate-500">{f.pieza.base}</span>
        </td>
        <td className="py-1.5 pr-2 text-right font-mono text-xs tabular-nums text-slate-500">{eur(f.europa)}</td>
        <td className="py-1.5 pr-2 text-right font-mono text-xs tabular-nums text-slate-900">{eur(f.china)}</td>
        <td />
        <td className="py-1.5 pr-2 text-right font-mono text-xs font-semibold tabular-nums text-slate-900">{soloIva ? eur(f.aduana * IVA) : eur(f.derecho + f.antidumping)}</td>
      </tr>
      {f.partidas.map(p => {
        const esp = p.especial ? ESPECIALES.find(e => e.id === p.especial) : undefined;
        return (
          <tr key={p.codigo + p.que} className="align-top text-xs">
            <td className="py-1 pl-5 pr-2 text-slate-700">
              <span className="font-mono text-[11px] text-slate-500">{p.codigo}</span> · {p.que}
              {p.confirmar && <span className="block text-[11px] text-amber-800">Confirmar: {p.confirmar}</span>}
            </td>
            <td />
            <td className="py-1 pr-2 text-right font-mono tabular-nums text-slate-500">{f.partidas.length > 1 ? eur(p.valor) : ''}</td>
            <td className="py-1 pr-2 text-right font-mono tabular-nums text-slate-700">
              {pct(p.arancel)}
              {esp?.tipo != null && <span className="block font-semibold text-rose-700">+ {pct(esp.tipo)} antidumping</span>}
            </td>
            <td className="py-1 pr-2 text-right font-mono tabular-nums text-slate-500">{soloIva ? '' : eur(p.derecho + p.antidumping)}</td>
          </tr>
        );
      })}
    </>
  );
}

export function VistaAranceles({ P, res, modelo }: { P: Parametros; res: Resultados; modelo: Modelo }) {
  const d = useMemo(() => calcularAranceles(P, res, modelo), [P, res, modelo]);
  const conArancel = d.filas.filter(f => !f.soloIva), soloIva = d.filas.filter(f => f.soloIva);
  const sum = (fs: FilaPieza[], k: 'europa' | 'china' | 'aduana') => fs.reduce((s, f) => s + f[k], 0);
  const derechosCon = conArancel.reduce((s, f) => s + f.derecho + f.antidumping, 0);
  const antidumping = d.piezas.antidumping;
  const tallerPiezas = d.piezas.aduana + d.piezas.derechos + d.piezas.gastosDestino + d.estructuraEspana;
  const taller = (e: Escenario) => e.aduana + e.derechos + e.gastosDestino;
  const veces = d.l7e.derechos / d.piezas.derechos;

  const comparacion: [string, (string | null)[], string?][] = [
    ['Lo que se compra en China (precio de fábrica)', [eur(d.piezas.fob), eur(d.fobCoche), eur(d.fobCoche)]],
    ['Flete y seguro hasta Valencia', [eur(d.piezas.flete + d.piezas.seguro), eur(d.l7e.flete + d.l7e.seguro), eur(d.m1.flete + d.m1.seguro)]],
    ['Valor en aduana', [eur(d.piezas.aduana), eur(d.l7e.aduana), eur(d.m1.aduana)], 'font-semibold'],
    ['Arancel', [eur(d.piezas.arancel), `${eur(d.l7e.arancel)} (${pct(ARANCEL_COCHE, 0)})`, `${eur(d.m1.arancel)} (${pct(ARANCEL_COCHE, 0)})`]],
    ['Antidumping (neumáticos y llantas)', [eur(antidumping), 'no se aplica a un coche entero', 'no se aplica a un coche entero']],
    ['Derecho compensatorio (coches eléctricos chinos)', ['no se aplica a piezas', 'no se aplica: la categoría L está excluida', `${eur(d.m1.compensatorio)} (${pct(COMPENSATORIO_RESTO)})`]],
    ['Total de derechos', [eur(d.piezas.derechos), eur(d.l7e.derechos), eur(d.m1.derechos)], 'font-semibold'],
    ['En % del valor en aduana', [pct(d.piezas.derechos / d.piezas.aduana), pct(d.l7e.derechos / d.l7e.aduana), pct(d.m1.derechos / d.m1.aduana)]],
    ['IVA de importación, aparte', [eur(d.piezas.iva), eur(d.l7e.iva), eur(d.m1.iva)]],
    ['Chasis y carrocería hechos en España (sin aduana)', [eur(d.estructuraEspana), 'vienen en el coche', 'vienen en el coche']],
    ['Montaje', ['lo hacéis aquí (no está contado)', 'incluido en el precio chino', 'incluido en el precio chino']],
    ['Puesto en el taller, sin IVA', [eur(tallerPiezas), eur(taller(d.l7e)), eur(taller(d.m1))], 'font-semibold'],
  ];

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-5">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900"><Ship className="h-6 w-6 text-sky-700" />Aranceles: importar de China</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Lo que cuesta pasar por la aduana española las piezas del Aeromóvil 1 compradas en China, todas menos el chasis y la carrocería, que se hacen aquí. Y lo mismo si llegara el vehículo entero ya fabricado. Las cuentas son para un vehículo con el diseño de ahora. Los tipos de los derechos están publicados; los precios en China, el flete y el montaje son estimaciones sin presupuesto.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Resumen destacado titulo="Piezas desde China" e={d.piezas} detalle={`Arancel normal de cada pieza (del 0 al 4,5 %) más ${eur(antidumping)} de antidumping en neumáticos y llantas.`} />
        <Resumen titulo="Vehículo entero, como cuadriciclo (L7e)" e={d.l7e} detalle={`${pct(ARANCEL_COCHE, 0)} sobre todo: piezas, chasis, carrocería y montaje. Sin derecho compensatorio, porque deja fuera la categoría L.`} />
        <Resumen titulo="Vehículo entero, como turismo (M1)" e={d.m1} detalle={`${pct(ARANCEL_COCHE, 0)} de arancel más ${pct(COMPENSATORIO_RESTO)} de derecho compensatorio (${pct(COMPENSATORIO_COOPERANTES)} si el fabricante está en la lista de los que colaboraron).`} />
      </div>

      <Seccion titulo="Piezas que pagan arancel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-1.5 pl-2 font-semibold">Pieza · código y lo que se declara</th>
                <th className="py-1.5 pr-2 text-right font-semibold">En Europa<span className="block normal-case tracking-normal">(catálogo)</span></th>
                <th className="py-1.5 pr-2 text-right font-semibold">En China<span className="block normal-case tracking-normal">(estimado)</span></th>
                <th className="py-1.5 pr-2 text-right font-semibold">Arancel</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Derechos</th>
              </tr>
            </thead>
            <tbody>
              {conArancel.map(f => <FilasPieza key={f.pieza.id} f={f} />)}
              <tr className="border-t-2 border-slate-300 font-semibold">
                <td className="py-2 pl-2">Total</td>
                <td className="py-2 pr-2 text-right font-mono text-xs tabular-nums text-slate-500">{eur(sum(conArancel, 'europa'))}</td>
                <td className="py-2 pr-2 text-right font-mono text-xs tabular-nums">{eur(sum(conArancel, 'china'))}</td>
                <td />
                <td className="py-2 pr-2 text-right font-mono text-xs tabular-nums">{eur(derechosCon)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Los derechos se pagan sobre el valor en aduana: el precio en China más su parte del flete y del seguro hasta el puerto. El flete se reparte entre las piezas según lo que vale cada una.</p>
      </Seccion>

      <Seccion titulo="Solo pagan IVA (arancel del 0 %)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-1.5 pl-2 font-semibold">Pieza · código y lo que se declara</th>
                <th className="py-1.5 pr-2 text-right font-semibold">En Europa</th>
                <th className="py-1.5 pr-2 text-right font-semibold">En China</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Arancel</th>
                <th className="py-1.5 pr-2 text-right font-semibold">IVA ({pct(IVA, 0)})</th>
              </tr>
            </thead>
            <tbody>
              {soloIva.map(f => <FilasPieza key={f.pieza.id} f={f} soloIva />)}
              <tr className="border-t-2 border-slate-300 font-semibold">
                <td className="py-2 pl-2">Total</td>
                <td className="py-2 pr-2 text-right font-mono text-xs tabular-nums text-slate-500">{eur(sum(soloIva, 'europa'))}</td>
                <td className="py-2 pr-2 text-right font-mono text-xs tabular-nums">{eur(sum(soloIva, 'china'))}</td>
                <td />
                <td className="py-2 pr-2 text-right font-mono text-xs tabular-nums">{eur(sum(soloIva, 'aduana') * IVA)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">El IVA de esta tabla es el {pct(IVA, 0)} de su valor en aduana; el total de abajo le suma la parte de los derechos y de los gastos hasta el taller.</p>
      </Seccion>

      <Seccion titulo="Derechos especiales">
        <ul className="flex flex-col gap-3">
          {ESPECIALES.map(e => (
            <li key={e.id} className="flex gap-3">
              <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', e.tipo != null ? 'text-rose-600' : 'text-amber-600')} />
              <div className="min-w-0 text-sm">
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-slate-900 underline-offset-2 hover:underline">{e.nombre}<ExternalLink className="h-3 w-3" /></a>
                <p className="font-mono text-xs text-rose-800">{e.tipos}</p>
                <p className="text-xs text-slate-500">{e.norma}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{e.nota}</p>
              </div>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="El IVA, aparte">
        <dl className="grid max-w-md grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-600">Valor en aduana de las piezas</dt><dd className="text-right font-mono text-xs tabular-nums">{eur(d.piezas.aduana)}</dd>
          <dt className="text-slate-600">+ derechos (arancel y antidumping)</dt><dd className="text-right font-mono text-xs tabular-nums">{eur(d.piezas.derechos)}</dd>
          <dt className="text-slate-600">+ gastos hasta el taller (agente, descarga, camión)</dt><dd className="text-right font-mono text-xs tabular-nums">{eur(d.piezas.gastosDestino)}</dd>
          <dt className="border-t border-slate-200 pt-1 font-medium text-slate-800">Base del IVA</dt><dd className="border-t border-slate-200 pt-1 text-right font-mono text-xs tabular-nums">{eur(d.piezas.baseIva)}</dd>
          <dt className="font-semibold text-slate-900">IVA de importación ({pct(IVA, 0)})</dt><dd className="text-right font-mono text-xs font-semibold tabular-nums">{eur(d.piezas.iva)}</dd>
        </dl>
        <p className="mt-3 max-w-3xl text-sm text-slate-700">
          El IVA no es un coste para quien importa como empresa o autónomo: se paga en la aduana y se deduce después en la declaración del IVA. Las empresas que declaran el IVA cada mes pueden incluso no adelantarlo y llevarlo directamente a su declaración (IVA diferido a la importación). Para un particular, en cambio, es un coste más.
        </p>
      </Seccion>

      <Seccion titulo="Comparación: piezas o vehículo entero">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-1.5 pl-2 font-semibold" />
                <th className="py-1.5 pr-2 text-right font-semibold">Piezas de China,<span className="block normal-case tracking-normal">chasis y carrocería de aquí</span></th>
                <th className="py-1.5 pr-2 text-right font-semibold">Entero de China,<span className="block normal-case tracking-normal">como cuadriciclo L7e</span></th>
                <th className="py-1.5 pr-2 text-right font-semibold">Entero de China,<span className="block normal-case tracking-normal">como turismo M1</span></th>
              </tr>
            </thead>
            <tbody>
              {comparacion.map(([n, vs, cls]) => (
                <tr key={n} className={cn('border-t border-slate-100', cls)}>
                  <td className="py-1.5 pl-2 pr-2 text-slate-700">{n}</td>
                  {vs.map((v, i) => <td key={i} className={cn('py-1.5 pr-2 text-right text-xs', v && /^\d/.test(v) ? 'font-mono tabular-nums text-slate-900' : 'text-slate-500')}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 max-w-3xl space-y-2 text-sm text-slate-700">
          <p>
            Importando las piezas se pagan {eur(d.piezas.derechos)} de derechos. Con el vehículo entero como cuadriciclo se pagan {eur(d.l7e.derechos)}, {veces.toLocaleString('es-ES', { maximumFractionDigits: 1 })} veces más, porque el {pct(ARANCEL_COCHE, 0)} se paga también sobre el chasis, la carrocería y el montaje. Como turismo serían {eur(d.m1.derechos)}. Y si se monta aquí, el vehículo es de fabricación europea: no paga nada de eso, sea cual sea su categoría.
          </p>
          <p>
            Ojo con leer solo los derechos: el vehículo entero hecho en China puede salir más barato en total, porque allí el chasis y la carrocería costarían menos que aquí, y en la primera columna no está contado el montaje. Además, un vehículo que llega entero tiene que venir homologado a nombre de su fabricante chino; con las piezas, el fabricante sois vosotros (ver «Homologación» en los departamentos).
          </p>
        </div>
      </Seccion>

      <Seccion titulo="Antes de importar">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>Pedir a la Agencia Tributaria una <strong>Información Arancelaria Vinculante (IAV)</strong> para la batería, el controlador, los cristales y la pantalla: dice por escrito qué código lleva cada una, obliga a todas las aduanas de la UE durante tres años y es gratis. Así no hay sorpresas con las líneas marcadas «confirmar».</li>
          <li>Pedir al proveedor que la factura diga el país de origen y, en los neumáticos, el nombre exacto del fabricante: el antidumping cambia del 4,3 al 45,3 % según quién los hizo.</li>
          <li>Comprar aquí la tornillería suelta y, si se puede, unos neumáticos fabricados fuera de China.</li>
          <li>La batería viaja como mercancía peligrosa (UN 3480, clase 9): sin su informe de ensayo UN 38.3 y su ficha de seguridad no la embarcan.</li>
          <li>Los tipos se leyeron el 8 de noviembre de 2026 en copias del arancel de la UE (TARIC). Antes de declarar, confirmarlos en el TARIC oficial o con el agente de aduanas.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Supuestos y fuentes">
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          {SUPUESTOS.map(s => <li key={s}>{s}</li>)}
        </ul>
        <ul className="mt-3 space-y-1 text-xs">
          {FUENTES.map(f => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-800 underline-offset-2 hover:underline">{f.nombre}<ExternalLink className="h-3 w-3" /></a>
              <span className="text-slate-500"> · {f.que}</span>
            </li>
          ))}
        </ul>
      </Seccion>
    </div>
  );
}

