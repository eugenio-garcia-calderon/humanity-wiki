// The «Impuestos» window (2026-11-12): everything built for the single tax,
// condensed. Each section shows the essentials; the rest opens behind «Más»,
// in cascade. Today's tax system and the proposed one side by side in
// «Hoy y propuesto». The section ids are the old single-page anchors, so links
// shared before still land in the right place.
import { useState } from 'react';
import { MessageSquarePlus, Pause, Play } from 'lucide-react';
import {
  ESCALA, ESCALAS, TOTAL_FIGURAS, EJEMPLO_INICIAL, type EscalaId, type Modo, type Ejemplo,
  cuentasPais, principales, euros, millones, porcentaje, MATRIZ, TIPO_GENERAL, calcularEjemplo,
} from '../../data/modeloSocioeconomico';
import { AnillosEscalas } from './AnillosEscalas';
import { EsquemaFlujos, EsquemaVertical } from './EsquemaFlujos';
import { MatrizAmbitos } from './MatrizAmbitos';
import { TuCaso } from './TuCaso';
import { Piezas, Costes, Tabla, DondeEstaElDinero, GanaYPierde } from './Comparativa';
import { PreguntasCobro } from './PreguntasCobro';
import { QuienDecide } from './QuienDecide';
import { Tercios, AyudaEntreEscalas } from './TerciosApoyo';
import { TresTramos, CincoPagos } from './Tramos';
import { LasCuentas, Retos, ListaFuentes } from './Cuentas';
import { Boton, Libre, Muestra, Segmentado } from './piezas';
import { Apartado, Cifra, Mas } from './ventanas';

const LECTURA_CORTA: Record<Modo, string> = { literal: `Empresas: ${Math.round(TIPO_GENERAL * 100)} % sin deducir`, eslabon: 'Como el IVA, deduciendo' };

/** The case in three numbers: what she pays today, with the model, and what she gets back. */
function Caso({ modo, ejemplo }: { modo: Modo; ejemplo: Ejemplo }) {
  const r = calcularEjemplo(ejemplo, modo);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Cifra valor={euros(r.totalHoy)} texto="paga hoy al año en impuestos y cotizaciones" nota={`el ${porcentaje(r.pctHoy * 100, 0)} de lo que cuesta su trabajo`} />
      <Cifra valor={euros(r.aporta)} texto="aportaría con el modelo, en sus compras y su sueldo" />
      <Cifra valor={euros(r.aportaNeto)} texto={`neto, tras recibir ${euros(r.recibe)} del fondo (un ingreso igual para cada persona)`} nota={`el ${porcentaje(r.pctModelo * 100, 0)} de lo que cuesta su trabajo`} />
      <p className="rounded-xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-950 sm:col-span-3">
        <b>A cambio:</b> el modelo recauda menos que hoy ({porcentaje(cuentasPais(modo).pctPIB, 0)} del PIB frente al 38 %), así que hay menos servicios públicos; no hay paro, y su pensión sería una sola, igual al salario mínimo.
        Las cifras, con su detalle, están en el cálculo completo.
      </p>
    </div>
  );
}

export function ImpuestosVentana({ onProponer }: { onProponer: () => void }) {
  const [modo, setModo] = useState<Modo>('literal');
  const [anillo, setAnillo] = useState<EscalaId | null>(null);
  const [nivel, setNivel] = useState<EscalaId | null>(null);
  const [mover, setMover] = useState(true);
  const [ejemplo, setEjemplo] = useState<Ejemplo>(EJEMPLO_INICIAL);
  const pais = cuentasPais(modo);
  const sel = anillo ? ESCALA[anillo] : null;
  const selNivel = nivel ? ESCALA[nivel] : null;

  return (
    <>
      {/* ── 1. Summary: the rings ── */}
      <section id="impuestos" aria-labelledby="impuestos-titulo" className="scroll-mt-40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <h2 id="impuestos-titulo" className="text-[2rem] font-[800] leading-[1.05] tracking-[-0.03em] sm:text-[2.8rem]">Un solo impuesto, en cuatro tramos</h2>
            <p className="mt-5 max-w-[36ch] text-[1.3rem] font-medium leading-snug text-slate-800 sm:text-[1.45rem]">
              Un 10 % en lo básico, un 20 % en lo secundario, un 40 % en el ocio y un 60 % en el lujo, sumado al precio.
              Llega al instante, en ocho partes iguales, a las escalas en las que vivimos.
            </p>
            <div className="mt-6 grid max-w-xl grid-cols-2 gap-3">
              <Cifra valor={`${TOTAL_FIGURAS} → 1`} texto="impuestos y cotizaciones de hoy, frente a uno" />
              <Cifra valor={`${porcentaje(pais.pctPIB, 0)}`} texto="del PIB recaudaría, frente al ≈ 38 % de hoy" />
            </div>
          </div>
          <div className="mx-auto w-full max-w-[520px]">
            <AnillosEscalas activa={anillo} onActiva={setAnillo} className="hidden w-full sm:block" />
            {/* Phones: the rings' labels would be too small; eight equal tiles say the same. */}
            <ul className="grid grid-cols-2 gap-2 sm:hidden">
              {ESCALAS.map(e => (
                <li key={e.id}>
                  <Libre onClick={() => setAnillo(a => (a === e.id ? null : e.id))} aria-pressed={anillo === e.id}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[15px] ${anillo === e.id ? 'border-slate-900 bg-white font-semibold' : 'border-slate-200 bg-white'}`}>
                    <Muestra color={e.color} className="h-3.5 w-3.5" /><span className="min-w-0 flex-1">{e.nombre}</span><span className="text-xs tabular-nums text-slate-500">{euros(pais.porPersonaEscala)}</span>
                  </Libre>
                </li>
              ))}
            </ul>
            <div aria-live="polite" className="mx-auto mt-4 min-h-[110px] max-w-[460px] text-center text-[15px] leading-relaxed">
              {sel ? (
                <>
                  <p className="flex items-center justify-center gap-2 font-bold text-slate-900"><Muestra color={sel.color} className="h-3.5 w-3.5" />{sel.nombre}</p>
                  <p className="mt-1 text-slate-700">{sel.recibe}.</p>
                  <p className="mt-2 text-slate-700">{sel.devuelve}.</p>
                  <p className="mt-2 text-sm text-slate-500">Un octavo: {euros(pais.porPersonaEscala)} por habitante y año{sel.id !== 'persona' && <>; en España, {millones(pais.porEscala)}</>}.</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-900">Ocho escalas, una dentro de otra</p>
                  <p className="mt-1 text-slate-700">Toca una escala para ver quién recibe su parte y qué devuelve. Los anillos dicen qué escala está dentro de cuál, no cuánto recibe: todas reciben lo mismo, {euros(pais.porPersonaEscala)} por habitante y año.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. How it works ── */}
      <Apartado id="como-funciona" fondo="blanco" titulo="Cómo funciona, en cinco pasos"
        entradilla="De cada pago se aparta su tramo. Lo apartado se junta y se reparte en ocho partes iguales, una por escala.">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { t: 'Pagas', d: 'Con tarjeta, Bizum o el móvil. El precio ya lleva su tramo, como hoy el IVA.' },
            { t: 'Se aparta el tramo', d: 'En el mismo instante, el sistema de pago separa el 10, el 20, el 40 o el 60 % del precio sin impuesto.' },
            { t: 'Se reparte en ocho', d: 'Cada escala recibe un octavo, lo mismo por habitante. Tu parte personal es un ingreso igual para cada persona.' },
            { t: 'Cada escala, en tercios', d: 'Un tercio para producir (invertir en lo que da trabajo y bienes), uno para cuidar (servicios a las personas) y uno libre, para lo que decida cada escala.' },
            { t: 'Cada escala decide', d: 'Su asamblea elige prioridades; su comité técnico las cumple al menor coste.' },
          ].map((p, i) => (
            <li key={p.t}>
              <span className="text-4xl font-[800] tabular-nums tracking-tight text-amber-500">{i + 1}</span>
              <h3 className="mt-1 text-lg font-bold">{p.t}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10"><TresTramos /></div>
        <Mas titulo="cuánto se paga en cinco compras de ejemplo">
          <CincoPagos />
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            El tramo se suma al precio sin impuesto, como el IVA: una cena de 40 € cuesta 56 € y 16 € van al fondo.
          </p>
        </Mas>
        <Mas titulo="preguntas sobre el cobro (efectivo, extranjero, empresas…)">
          <PreguntasCobro modo={modo} />
        </Mas>
        <Mas titulo={`las empresas: un ${Math.round(TIPO_GENERAL * 100)} % de lo que compran, sin deducir nada`}>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-600">
            Cuando una empresa compra a otra (la panadería, harina; la fábrica, tela), paga un {porcentaje(TIPO_GENERAL * 100, 0)} y ya está: no se deduce ni se devuelve nada.
            Desaparece la contabilidad del IVA repercutido y soportado, las liquidaciones trimestrales y las devoluciones. A cambio, el impuesto se suma un poco en cada eslabón de la cadena:
            de media, los precios llevan un {porcentaje((pais.cascada - 1) * 100, 1)} más por esa acumulación.
          </p>
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-900">{LECTURA_CORTA.literal} (la propuesta)</dt>
              <dd className="mt-0.5 leading-relaxed text-slate-600">Recauda ≈ {porcentaje(cuentasPais('literal').pctPIB, 0)} del PIB. Sin papeleo para ninguna empresa.</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">{LECTURA_CORTA.eslabon} (para comparar)</dt>
              <dd className="mt-0.5 leading-relaxed text-slate-600">Recauda ≈ {porcentaje(cuentasPais('eslabon').pctPIB, 0)} del PIB. Cada producto lleva exactamente su tramo, pero las empresas siguen llevando la cuenta del IVA.</dd>
            </div>
          </dl>
          <div className="mt-4">
            <Segmentado<Modo> etiqueta="Cómo pagan las empresas" valor={modo} onChange={setModo}
              opciones={[{ id: 'literal', texto: LECTURA_CORTA.literal }, { id: 'eslabon', texto: LECTURA_CORTA.eslabon }]} />
          </div>
        </Mas>
      </Apartado>

      {/* ── 3. Today vs proposed ── */}
      <Apartado id="hoy" titulo="El sistema de hoy y el propuesto"
        entradilla="Hoy cada administración cobra sus impuestos y tasas, con sus reglas y plazos, y después el dinero se redistribuye. La propuesta lo sustituye por un cobro automático que ya llega repartido.">
        <Tabla modo={modo} />
        <Mas titulo="todas las piezas del sistema de hoy">
          <Piezas />
        </Mas>
        <Mas titulo="lo que cuesta cumplir hoy (horas, gestorías, inspecciones)">
          <Costes />
        </Mas>
        <Mas titulo="dónde está el dinero hoy y dónde estaría">
          <DondeEstaElDinero modo={modo} />
        </Mas>
        <Mas titulo="quién gana y quién pierde con el cambio">
          <GanaYPierde modo={modo} />
        </Mas>
      </Apartado>

      {/* ── 4. Where the money goes ── */}
      <Apartado id="esquema" fondo="blanco" titulo="Adónde va el dinero"
        entradilla="El camino de cada euro, desde el pago hasta lo que vuelve a las personas. Toca una escala para seguir su parte.">
        <div className="mb-3 hidden justify-end md:flex">
          <Boton onClick={() => setMover(v => !v)} aria-pressed={!mover}>
            {mover ? <><Pause className="h-4 w-4" /> Detener el movimiento</> : <><Play className="h-4 w-4" /> Ver el dinero moverse</>}
          </Boton>
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 md:block">
          <EsquemaFlujos modo={modo} activa={nivel} onActiva={setNivel} mover={mover} />
        </div>
        <div className="md:hidden"><EsquemaVertical modo={modo} activa={nivel} onActiva={setNivel} /></div>
        <div aria-live="polite" className="mt-4 min-h-[72px] rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[15px]">
          {selNivel ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 font-bold"><Muestra color={selNivel.color} />{selNivel.nombre}</p>
                <p className="mt-1 text-slate-700">{selNivel.recibe}.</p>
              </div>
              <div className="text-slate-700">
                {selNivel.id === 'persona'
                  ? <>Recibe {euros(pais.porPersonaEscala)} al año, unos {euros(pais.porPersonaEscala / 12)} al mes, y decide libremente en qué gastarlo.</>
                  : <>Sus mayores partidas: {principales(selNivel.id).map(a => `${a.nombre.toLowerCase()} (${MATRIZ[selNivel.id][a.id].peso} %)`).join(', ')}.</>}
              </div>
            </div>
          ) : (
            <p className="text-slate-600">
              En España, lo apartado sumaría {millones(pais.recaudacion)} al año, y cada escala recibiría {millones(pais.porEscala)}.
              Cada pago deja de media el {porcentaje(pais.tipoMedio * 100)}; medido sobre todo lo que produce el país (el PIB) es el {porcentaje(pais.pctPIB, 0)}, porque se cobra al pagar un sueldo y otra vez cuando ese dinero se gasta, como hoy el IRPF y el IVA.
            </p>
          )}
        </div>
        <Mas titulo="un tercio para producir, uno para cuidar y uno libre">
          <Tercios modo={modo} />
          <Mas titulo="la ayuda entre escalas, en lugar de subvenciones">
            <AyudaEntreEscalas modo={modo} />
          </Mas>
        </Mas>
        <Mas titulo="quién se ocupa de qué: ocho escalas por quince ámbitos">
          <MatrizAmbitos modo={modo} />
        </Mas>
      </Apartado>

      {/* ── 5. A worked case ── */}
      <Apartado id="ejemplo" titulo="Una persona de un pueblo de 400 habitantes"
        entradilla="Gana 26.000 € brutos al año en una empresa pequeña y vive con su pareja en la Sierra Norte de Madrid. Lo esencial, en una línea:">
        <Caso modo={modo} ejemplo={ejemplo} />
        <Mas titulo="el cálculo completo y los mandos">
          <TuCaso modo={modo} ejemplo={ejemplo} onEjemplo={setEjemplo} />
        </Mas>
      </Apartado>

      {/* ── 6. Who decides ── */}
      <Apartado id="decide" fondo="blanco" titulo="Quién decide en cada escala"
        entradilla="Una asamblea ciudadana elige las prioridades; un comité técnico las cumple al menor coste y de la forma más ecológica. Las cuentas son abiertas.">
        <QuienDecide />
      </Apartado>

      {/* ── 7. Accounts, open problems, sources ── */}
      <Apartado id="cuentas" titulo="Las cuentas, lo que falta y las fuentes"
        entradilla={<>Con los datos de 2025, el modelo apartaría {millones(pais.recaudacion)} al año: el {porcentaje(pais.pctPIB, 0)} del PIB.</>}>
        <Mas titulo="las cuentas del país, paso a paso" abierto={false}>
          <LasCuentas modo={modo} onModo={setModo} />
        </Mas>
        <Mas titulo="lo que falta por resolver">
          <Retos modo={modo} />
        </Mas>
        <Mas titulo="fuentes y método">
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Las cifras de España salen de las fuentes oficiales enlazadas. Donde no hay un dato oficial exacto, la página dice que es una estimación.
            El gasto por funciones es de 2024, la recaudación y la base de 2025, y las reglas del IRPF y las cotizaciones del caso, de 2026.
          </p>
          <div className="mt-4"><ListaFuentes /></div>
        </Mas>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold">¿Cómo lo mejorarías?</h3>
            <p className="mt-1 max-w-2xl text-slate-300">Cada propuesta se revisa y, si mejora el modelo, se aplica a esta página.</p>
          </div>
          <Boton onClick={onProponer} className="border-white bg-white text-slate-900 hover:bg-slate-100">
            <MessageSquarePlus className="h-4 w-4" /> Proponer una mejora
          </Boton>
        </div>
      </Apartado>
    </>
  );
}
