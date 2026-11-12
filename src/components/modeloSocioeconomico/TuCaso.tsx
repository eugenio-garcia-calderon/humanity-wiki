// The worked example Eugenio asked for: a person who lives with her partner in
// a village of 400 people in the Comunidad de Madrid. How much money she
// handles a day, a month and a year; how much goes to each layer; and the same
// person under today's system. Every figure is computed from the controls:
// her wage, who pays it (the tier of wages is the size of the company) and her
// spending in each tier.
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import {
  EMPLEADOR, EMPLEADORES, ESCALAS, ESPANA, TRAMO, type Empleador, type Modo, type Ejemplo, type Tramo,
  calcularEjemplo, modeloPorFuncion, recibeLugar, euros, millones, porcentaje, sumaGasto,
} from '../../data/modeloSocioeconomico';
import { Fuente, Muestra, Regulador, Segmentado } from './piezas';

const dia = (n: number) => n / 365;
const mes = (n: number) => n / 12;

export function TuCaso({ modo, ejemplo, onEjemplo }: { modo: Modo; ejemplo: Ejemplo; onEjemplo: (e: Ejemplo) => void }) {
  // Services per inhabitant, same perimeter as «Lo que se gana y lo que se pierde».
  const porFuncion = modeloPorFuncion(modo);
  const serviciosHoy = (porFuncion.reduce((s, f) => s + f.hoy, 0) * 1e6) / ESPANA.poblacion;
  const serviciosModelo = (porFuncion.reduce((s, f) => s + f.modelo, 0) * 1e6) / ESPANA.poblacion;
  const r = calcularEjemplo(ejemplo, modo);
  const set = (p: Partial<Ejemplo>) => onEjemplo({ ...ejemplo, ...p });
  const maxBarra = Math.max(r.totalHoy, r.aporta);

  const emp = EMPLEADOR[ejemplo.empleador];
  const cambio = (t: Tramo) => (r.precioTramo[t] - 1) * 100;
  const filas: { t: ReactNode; v: number; fuerte?: boolean; signo?: string }[] = [
    { t: 'Lo que paga la empresa por su trabajo', v: r.costeTrabajo },
    { t: r.tipoSueldo ? `Le llega a su cuenta (la empresa suma el ${porcentaje(r.tipoSueldo * 100, 0)} de impuesto encima)` : 'Le llega a su cuenta (sin impuesto sobre el sueldo)', v: r.netoModelo },
    { t: 'Gasta (la misma cesta que hoy, con los precios del modelo)', v: r.gastoModelo, signo: '−' },
    { t: 'Le queda de su trabajo', v: r.sobraModelo, fuerte: true },
    { t: ejemplo.enComunidad ? `Recibe del fondo su dividendo` : `Recibe del fondo su dividendo (${euros(r.dividendo)}) y la parte de su hogar (${euros(r.parteFamilia)})`, v: r.recibe, signo: '+' },
    { t: 'Aporta al fondo común', v: r.aporta, fuerte: true },
  ];
  const GASTOS: { t: Tramo; etiqueta: string; ayuda: string; max: number }[] = [
    { t: 1, etiqueta: 'Primera necesidad, al mes', ayuda: 'Comida, alquiler, luz, agua, transporte, salud.', max: 2_000 },
    { t: 2, etiqueta: 'Segunda necesidad, al mes', ayuda: 'Ropa, muebles, móvil e internet, seguros.', max: 1_500 },
    { t: 3, etiqueta: 'Ocio y lujo, al mes', ayuda: 'Bares, restaurantes, viajes, ocio, tabaco.', max: 1_500 },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ── The controls and the chain of places ── */}
      <div className="space-y-6">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <Regulador etiqueta="Su sueldo bruto anual (hoy)" valor={ejemplo.bruto} min={12_000} max={60_000} paso={500}
            mostrar={euros(ejemplo.bruto)} onChange={v => set({ bruto: v })} />
          <p className="-mt-3 text-xs leading-relaxed text-slate-500">
            Como referencia, el salario mediano en España fue de 24.497 € en 2024 y el medio de la Comunidad de Madrid, 34.410 €.<Fuente id="ine-salarios">INE</Fuente>
          </p>
          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">Trabaja en</span>
            <Segmentado<Empleador> etiqueta="Quién le paga el sueldo" valor={ejemplo.empleador} onChange={v => set({ empleador: v })}
              opciones={EMPLEADORES.map(x => ({ id: x.id, texto: `${x.corto} (${porcentaje(x.tipo * 100, 0)})` }))} />
            <span className="block text-xs text-slate-500">{emp.nombre}{emp.nota ? `. ${emp.nota}.` : '.'}</span>
          </div>
          <p className="text-sm font-medium text-slate-700">Lo que gasta, con los precios de hoy (su parte): {euros(sumaGasto(ejemplo.gasto))} al mes</p>
          {GASTOS.map(g => (
            <Regulador key={g.t} etiqueta={`${g.etiqueta} (tramo ${g.t}, ${porcentaje(TRAMO[g.t].tipo * 100, 0)})`} valor={ejemplo.gasto[g.t]} min={0} max={g.max} paso={10}
              mostrar={euros(ejemplo.gasto[g.t])} onChange={v => set({ gasto: { ...ejemplo.gasto, [g.t]: v } })} ayuda={g.ayuda} />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Vive</span>
            <Segmentado etiqueta="Con quién vive" valor={ejemplo.pareja ? 'si' : 'no'} onChange={v => set({ pareja: v === 'si' })}
              opciones={[{ id: 'si', texto: 'con su pareja' }, { id: 'no', texto: 'sola' }]} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">En</span>
            <Segmentado etiqueta="Tipo de vivienda" valor={ejemplo.enComunidad ? 'edificio' : 'casa'} onChange={v => set({ enComunidad: v === 'edificio' })}
              opciones={[{ id: 'casa', texto: 'una casa' }, { id: 'edificio', texto: 'un edificio con comunidad' }]} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900">Sus ocho escalas</h3>
          <p className="mt-1 text-sm text-slate-600">
            A cada una aporta lo mismo: <b className="tabular-nums text-slate-900">{euros(r.porEscala)} al año</b> ({euros(mes(r.porEscala))} al mes, {euros(dia(r.porEscala), 2)} al día).
            Esto es lo que recibe cada lugar donde vive:
          </p>
          <ol className="mt-4 space-y-0">
            {ESCALAS.map((e, i) => {
              const recibe = recibeLugar(e, modo, ejemplo);
              const lugar = e.id === 'vecindad' && ejemplo.enComunidad ? 'La comunidad vecinal de su edificio' : e.ejemplo;
              return (
                <li key={e.id} className="relative flex gap-3 pb-3 last:pb-0">
                  {/* the line that nests each place in the next one */}
                  {i < ESCALAS.length - 1 && <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />}
                  <Muestra color={e.color} className="relative mt-1" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="flex flex-wrap justify-between gap-x-3">
                      <span className="font-semibold text-slate-900">{lugar}</span>
                      <span className="tabular-nums text-slate-700">
                        {recibe == null
                          ? (e.id === 'vecindad' ? `${euros(r.pais.porPersonaEscala)} por vecino` : '—')
                          : e.id === 'continente' || e.id === 'planeta'
                            ? `España aporta ${millonesCortos(recibe)} al año`
                            : `recibe ${recibe >= 1e6 ? millonesCortos(recibe) : euros(recibe)} al año`}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-500">{e.nombre}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            En la Comunidad de Madrid provincia y región coinciden: el modelo mantiene las dos escalas y la provincial se organiza por comarcas,
            como la Sierra Norte y sus 44 pueblos, para servir a los municipios pequeños.<Fuente id="cam-pueblos" />
          </p>
        </div>
      </div>

      {/* ── The results ── */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900">Cuánto dinero maneja con el modelo</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium" scope="col"><span className="sr-only">Concepto</span></th>
                  <th className="py-2 pl-3 text-right font-medium" scope="col">Al día</th>
                  <th className="py-2 pl-3 text-right font-medium" scope="col">Al mes</th>
                  <th className="py-2 pl-3 text-right font-medium" scope="col">Al año</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {filas.map((f, k) => (
                  <tr key={k} className={cn('border-b border-slate-100 last:border-0', f.fuerte && 'font-semibold text-slate-900')}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-700"><span className={cn(f.fuerte && 'font-semibold text-slate-900')}>{f.signo && <span className="mr-1 text-slate-400">{f.signo}</span>}{f.t}</span></th>
                    <td className="py-2 pl-3 text-right">{euros(dia(f.v), 2)}</td>
                    <td className="py-2 pl-3 text-right">{euros(mes(f.v))}</td>
                    <td className="py-2 pl-3 text-right">{euros(f.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Por sus manos pasan {euros(r.maneja)} al año ({euros(dia(r.maneja), 2)} al día): lo que vale su trabajo más lo que compra.
            La empresa paga lo mismo que hoy; los precios cambian: la misma cesta cuesta {euros(mes(r.gastoModelo))} al mes en vez de {euros(sumaGasto(ejemplo.gasto))}.
            Lo de primera necesidad {cambio(1) < 0 ? 'baja' : 'sube'} un {porcentaje(Math.abs(cambio(1)), 0)}, porque su {porcentaje(TRAMO[1].tipo * 100, 0)} sustituye al IVA y los impuestos especiales de hoy;
            lo de segunda necesidad sube un {porcentaje(cambio(2), 0)} y el ocio y el lujo, un {porcentaje(cambio(3), 0)}
            {modo === 'literal' ? ', contando el 25 % que se pagan las empresas entre sí y acaba dentro de los precios' : ''}.
            De su dividendo, un tercio ({euros(r.dividendo / 3)}) va a sus participaciones en lo que produce, otro a cuidados y otro es libre.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900">La misma persona, hoy y con el modelo</h3>
          <p className="mt-1 text-sm text-slate-600">Lo que paga en un año en impuestos, cotizaciones y cuotas obligatorias, con la misma empresa pagando lo mismo por su trabajo y la misma cesta de la compra.</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <Columna titulo="Hoy" total={r.totalHoy} max={maxBarra} items={r.hoy} tono="hoy"
              pie={`El ${porcentaje(r.pctHoy * 100, 0)} de lo que vale su trabajo, en ${r.hoy.length} conceptos distintos, cada uno con sus reglas y sus plazos.`} />
            <Columna titulo="Con el modelo" total={r.aporta} max={maxBarra} items={r.modelo} tono="modelo"
              pie={`Y recibe ${euros(r.recibe)} del fondo. Aportación neta: ${euros(r.aportaNeto)}, el ${porcentaje(r.pctModelo * 100, 0)} de lo que vale su trabajo.`} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
            <div>
              <dt className="text-slate-500">Le queda al año, hoy</dt>
              <dd className="text-2xl font-bold tabular-nums text-slate-900">{euros(r.sobraHoy)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Le queda al año de su trabajo, con el modelo</dt>
              <dd className="text-2xl font-bold tabular-nums text-slate-900">{euros(r.sobraModelo)}</dd>
              <dd className="text-xs text-slate-500">{euros(r.sobraModelo + r.recibe)} con lo que recibe del fondo</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Hoy: cotizaciones de 2026, IRPF con las escalas estatal y de Madrid<Fuente id="irpf-madrid" /> y sus mínimos<Fuente id="minimo-madrid" />,
            IBI, basuras y vehículo medios de un hogar<Fuente id="roams" />. Es un cálculo orientativo: no incluye deducciones personales.
            «Le queda» descuenta en los dos casos sus impuestos locales y la cesta de la compra; con el modelo, además, recibe {euros(r.recibe)} del fondo.
          </p>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
            <b>Lo que deja de tener.</b> No hay paro, y su pensión sería una sola, igual al salario mínimo (lo explica la ventana Pensiones); lo demás se apoya en lo que ahorre e invierta, en su familia,
            su comunidad y su municipio, en préstamos que solo suben con la inflación y en un trabajo u ocupación; si llega a tener una discapacidad, en el apoyo en especie.
            Y hay menos servicios públicos: por habitante, unos {euros(serviciosModelo)} entre servicios e inversión al año en lugar de {euros(serviciosHoy)}{' '}
            (lo cuentan «Frente a hoy» y «Lo que falta por resolver»).
            {ejemplo.empleador === 'pequena' && <> Gran parte de la diferencia viene de que su empresa es pequeña: su sueldo paga solo el {porcentaje(r.tipoSueldo * 100, 0)}.</>}
          </p>
        </div>
      </div>
    </div>
  );
}

const millonesCortos = (e: number) => millones(e / 1e6);

function Columna({ titulo, total, max, items, tono, pie }: {
  titulo: string; total: number; max: number; items: { id: string; nombre: string; euros: number }[]; tono: 'hoy' | 'modelo'; pie: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-semibold text-slate-900">{titulo}</h4>
        <span className="text-xl font-bold tabular-nums text-slate-900">{euros(total)}</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map(x => (
          <li key={x.id} className="text-sm">
            <span className="flex justify-between gap-3"><span className="text-slate-700">{x.nombre}</span><span className="shrink-0 tabular-nums text-slate-900">{euros(x.euros)}</span></span>
            <span className="mt-1 block h-1.5 rounded-full bg-slate-100">
              <span className={cn('block h-1.5 rounded-full', tono === 'hoy' ? 'bg-slate-400' : 'bg-slate-900')} style={{ width: `${(x.euros / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">{pie}</p>
    </div>
  );
}
