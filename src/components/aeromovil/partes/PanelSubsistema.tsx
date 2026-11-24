// The panel of one part of the vehicle (2026-11-24, Eugenio: «que se comporte como un elemento en sí … que te enseñe la
// versión 3D de lo que hay actualmente, las opciones que hay, los componentes, el coste, el peso, todo ello, y las decisiones
// tomadas, la geometría que está detrás, los ángulos, dimensiones»; the same day, for the rest of the departments: «haz lo mismo
// … para el resto de elemento del vehículo»). It sits under the 3D view, which shows only that part (`Aeromovil.tsx`). From the top:
// what the project carries today (the favourite's kg and €), the options with their stars, the numbers of this design (the steering's
// geometry: this design's Ackermann and the study's angles), the decisions, the plan of the favourite.
// Everything is read from the design and its prices; the star writes the design's own field (`opciones.ts`).
import { useEffect, useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { ModeloTriciclo, Parametros, Resultados } from '../geometria';
import { camposTriciclo, limitarTriciclo } from '../geometriaTriciclo';
import { fmt } from '../controles';
import { explicacion } from '../explicaciones';
import { eur, type PreciosDiseno } from '../precios/precios';
import { fichaRueda } from '../ruedas/catalogo';
import { COMPARATIVA_ESTUDIO, CONCEPTOS_DIRECCION, CREMALLERA_GEMINI, AVISO_MATERIALES, HIPOTESIS_ESTUDIO, MATERIALES_DIRECCION, OBJETIVO_ESTUDIO, PREGUNTAS_ESTUDIO } from './direccion';
import { anguloBrazoAckermann, circuloDeGiro, fueraIdeal, relacionDeDireccion } from './geometriaDireccion';
import { DibujoConcepto, VistaAckermann } from './DibujosGeometria';
import { Opciones, PartesDelProyecto, type Favoritas } from './Opciones';
import { PlanoDireccion } from './PlanoDireccion';
import { anotarDecision, escribirPorque, hoy, ultimaDecision } from './decisiones';
import { aguantaRueda, datosGiro, numerosActuales } from './numeros';
import { camposDeFavorita, elegidasDe, favoritaDe, opcionesDe } from './opciones';
import { conEvaluaciones, useEvaluaciones } from './alternativas';
import { datosDelDiseno } from './datosDiseno';
import { DE_DEP, NOMBRE_DEP, partesDe, subsistema } from './subsistemas';
import { A_MEDIDA_RODAJE, type IdSub } from './tipos';

type Poner = <K extends keyof Parametros>(k: K, v: Parametros[K]) => void;
type Eje = 'del' | 'tras' | 'todas';
const mm = (m: number) => `${Math.round(m * 1000)} mm`;

function Seccion({ titulo, abierta = false, children, nota }: { titulo: string; abierta?: boolean; children: React.ReactNode; nota?: string }) {
  return (
    <details open={abierta} className="group border-t border-slate-200 px-3 py-2 first:border-t-0">
      <summary className="flex cursor-pointer select-none items-baseline gap-2 py-1 text-sm font-semibold text-slate-900">
        <span>{titulo}</span>{nota && <span className="text-[11px] font-normal text-slate-500">{nota}</span>}
      </summary>
      <div className="mt-2 flex flex-col gap-3 pb-1">{children}</div>
    </details>
  );
}

/** The reason of the latest decision: written when the field is left, so typing does not recalculate the whole vehicle on every key. */
function Porque({ valor, alGuardar }: { valor: string; alGuardar: (v: string) => void }) {
  const [t, setT] = useState(valor);
  useEffect(() => setT(valor), [valor]);
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      ¿Por qué esta? (queda guardado con el diseño)
      <textarea value={t} onChange={e => setT(e.target.value)} onBlur={() => t !== valor && alGuardar(t)} rows={2} maxLength={600}
        placeholder="Por ejemplo: «es la única con peso y precio publicados; sirve para el prototipo y se cambia en la serie»"
        className="w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-teal-600 focus:outline-none" />
    </label>
  );
}

export function PanelSubsistema({ sub, P, set, modelo, res, precios, alElegirSub }: {
  sub: IdSub; P: Parametros; set: Poner; modelo: ModeloTriciclo; res: Resultados; precios: PreciosDiseno | null;
  alElegirSub: (s: IdSub | 'resumen') => void;
}) {
  const rt = res.triciclo, S = subsistema(sub), deModelo = S.origen === 'modelo';
  // the options whose figures only the model can say (a catalogue motor with no published mass, a battery's place) are tried in the background
  const lista0 = opcionesDe(sub, P), porProbar = lista0.filter(o => o.calculando).map(o => o.id);
  const ev = useEvaluaciones(sub, P, porProbar, !!rt && porProbar.length > 0);
  if (!rt) return null;
  const T = camposTriciclo(P), lista = conEvaluaciones(lista0, ev), actual = numerosActuales(sub, precios);
  const fav: Favoritas = sub === 'ruedas' ? { ids: [], ejes: favoritaDe('ruedas', P) } : deModelo ? { ids: elegidasDe(sub, P) } : { ids: favoritaDe(sub, P) === A_MEDIDA_RODAJE ? [] : [favoritaDe(sub, P)] };
  const unidades = S.dep === 'rodaje' && sub !== 'direccion' ? modelo.ruedas.length : 1;
  const elegidas = lista.filter(o => fav.ids.includes(o.id)), elegida = elegidas[0] ?? null;
  const decision = ultimaDecision(P.decisionesRodaje, sub);
  const elegir = (id: string, eje?: Eje) => {
    for (const [k, v] of camposDeFavorita(sub, id, eje)) set(k as keyof Parametros, v as never);
    const i = id.indexOf(':');
    set('decisionesRodaje', anotarDecision(P.decisionesRodaje, sub, { opcion: deModelo ? id.slice(i + 1) : id, ...(deModelo ? { decision: id.slice(0, i) } : {}), ...(eje ? { eje } : {}), fecha: hoy() }));
  };
  const quitar = () => { for (const [k, v] of camposDeFavorita(sub, A_MEDIDA_RODAJE)) set(k as keyof Parametros, v as never); set('decisionesRodaje', anotarDecision(P.decisionesRodaje, sub, { opcion: A_MEDIDA_RODAJE, fecha: hoy() })); };
  const comprobaciones = res.comprobaciones.filter(c => S.comprobaciones.test(c.nombre));
  const giro = datosGiro(modelo, rt);
  const aguanta = sub === 'ruedas' ? (id: string, eje: 'del' | 'tras') => aguantaRueda(id, eje, modelo, rt) : undefined;
  const ruedaActual = (e: 'del' | 'tras') => { const id = String(e === 'del' ? T.tRuedaDel : T.tRuedaTras); return lista.some(o => o.id === id) ? null : fichaRueda(id) ? `${fichaRueda(id)!.grupo} ${fichaRueda(id)!.medida}` : id; };
  const ajena = sub === 'ruedas' ? [ruedaActual('del'), ruedaActual('tras')].filter(Boolean) : [];
  const nombreOpcion = (id: string, clave?: string) => id === A_MEDIDA_RODAJE ? (S.medida ?? 'ninguna: la estimación del proyecto') : lista.find(o => o.id === (clave ? `${clave}:${id}` : id))?.n ?? id;
  const grupos = [...new Set(lista.map(o => o.grupo ?? ''))];
  const datos = datosDelDiseno(sub, P, modelo, res);
  const solaEnDep = partesDe(S.dep, P).length === 1;

  return (
    <section aria-label={`${NOMBRE_DEP[S.dep]}: ${S.nombre}`} className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2 bg-slate-50 px-3 py-3">
        {!solaEnDep && <Button variant="ghost" onClick={() => alElegirSub('resumen')} className="shrink-0 gap-1 px-1.5 py-1 text-[11px] normal-case tracking-normal text-slate-600"><ArrowLeft className="h-3.5 w-3.5" />{NOMBRE_DEP[S.dep]}</Button>}
        <div className="min-w-[12rem] flex-1">
          <h3 className="text-base font-semibold text-slate-900">{S.nombre}</h3>
          <p className="text-xs text-slate-600">{S.lema}</p>
        </div>
        <div className="flex items-baseline gap-4 text-right" aria-label="Lo que el proyecto lleva de esta parte">
          <div><div className="font-mono text-lg font-semibold tabular-nums text-slate-900">{fmt(actual.kg, actual.kg < 10 ? 2 : 1)} kg</div><div className="text-[10px] uppercase tracking-wider text-slate-500">peso en el proyecto</div></div>
          <div><div className="font-mono text-lg font-semibold tabular-nums text-slate-900">{eur(actual.eur)}</div><div className="text-[10px] uppercase tracking-wider text-slate-500">precio en el proyecto</div></div>
        </div>
        <p className="flex w-full items-center gap-1.5 text-xs text-slate-700">
          <Star className={cn('h-4 w-4 shrink-0', (sub === 'ruedas' || elegidas.length > 0) ? 'fill-amber-400 text-amber-600' : 'text-slate-400')} />
          {sub === 'ruedas'
            ? <span>Ruedas de delante: <strong>{nombreOpcion(favoritaDe('ruedas', P).del)}</strong> · de detrás: <strong>{nombreOpcion(favoritaDe('ruedas', P).tras)}</strong></span>
            : deModelo ? <span>Lo que el diseño lleva ahora: {elegidas.length ? elegidas.map((o, i) => <span key={o.id}>{i > 0 && ' · '}<strong>{o.n}</strong></span>) : 'ninguna de estas opciones'}. Pulsa la estrella de otra para cambiarlo.</span>
              : elegida ? <span>La favorita: <strong>{elegida.n}</strong>. <Button variant="ghost" onClick={quitar} className="inline px-0 py-0 text-xs font-normal normal-case tracking-normal text-teal-700 underline hover:bg-transparent">Quitar la favorita</Button> y volver a la estimación del proyecto.</span>
                : <span>Ninguna favorita todavía: {S.medida ? `${S.medida}` : 'el proyecto usa su propia estimación'}. Elige una con la estrella.</span>}
        </p>
      </header>

      <Seccion titulo="Lo que lleva hoy el proyecto" abierta nota="peso y precio que ya cuentan arriba, en «Peso» y en «Precios»">
        {elegidas.some(o => o.partes.length > 0) && !deModelo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-2 text-xs text-slate-700">
            <p className="font-medium text-slate-900">Componentes de la favorita: {elegida!.n}</p>
            <ul className="mt-1 list-disc pl-4">{elegida!.partes.map(p => <li key={p.n}>{p.cantidad > 1 ? `${p.cantidad} × ` : ''}{p.n}{p.origen === 'fabricar' ? ' (se fabrica)' : ''}</li>)}</ul>
          </div>)}
        <PartesDelProyecto partes={actual.partes} />
        {ajena.length > 0 && <p className="text-xs text-amber-800">Ahora las ruedas son de vehículo pesado ({ajena.join(' y ')}): no están entre las de bicicleta de abajo. Se eligen en «Ejes y ruedas», en el panel de la derecha.</p>}
        {comprobaciones.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-xs">
            {comprobaciones.map(c => { const bien = c.holgura >= c.minimo; return (
              <li key={c.nombre} className={cn('flex items-start gap-1.5', bien ? 'text-slate-700' : 'text-red-700')}>
                <span aria-hidden className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', bien ? 'bg-emerald-500' : 'bg-red-500')} />
                <span><span className="sr-only">{bien ? 'Cumple: ' : 'No cumple: '}</span>{c.nombre}{c.mostrar ? ` — ${c.mostrar}` : ''}</span>
              </li>); })}
          </ul>)}
      </Seccion>

      <Seccion titulo={`Opciones (${lista.length})`} abierta nota="elige la favorita con la estrella · compáralas">
        {grupos.map((g, i) => (
          <div key={g || 'todas'} className="flex flex-col gap-2">
            {g && <h4 className="text-sm font-semibold text-slate-900">{g}</h4>}
            <Opciones lista={lista.filter(o => (o.grupo ?? '') === g)} fav={fav} unidades={unidades} actual={actual} alElegir={elegir} aguanta={aguanta} conIntro={i === 0} />
          </div>))}
        {lista.some(o => o.calculando) && <p className="text-[11px] text-slate-500">«Calculando»: el modelo prueba cada opción en una copia de este diseño (un instante cada una) para decir qué pesaría y costaría el proyecto con ella.</p>}
      </Seccion>

      {datos.length > 0 && (
        <Seccion titulo="Datos de esta parte en este diseño" abierta nota="dimensiones y cifras que el modelo usa ahora">
          <ul className="grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">{datos.map(([k, v]) => <li key={k} className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-0.5"><span className="text-slate-600">{k}</span><span className="text-right font-mono tabular-nums text-slate-900">{v}</span></li>)}</ul>
        </Seccion>)}

      {deModelo && (S.selectores ?? []).map(clave => { const ex = explicacion(clave as keyof Parametros); return ex && (
        <Seccion key={clave} titulo={`Por qué importa: ${ex.nombre}`} nota="lo que dice el modelo de esta decisión">
          <p className="text-xs leading-snug text-slate-700"><span className="font-medium">Qué es.</span> {ex.queEs}</p>
          <p className="text-xs leading-snug text-slate-700"><span className="font-medium">Por qué importa.</span> {ex.porQueImporta}</p>
          {ex.referencias.length > 0 && <ul className="list-disc pl-4 text-xs text-slate-600">{ex.referencias.map(r => <li key={r}>{r}</li>)}</ul>}
        </Seccion>); })}

      {sub === 'direccion' && (<>
        <Seccion titulo="Geometría: por qué la rueda de fuera gira menos (Ackermann)" abierta nota="con la batalla y la vía de este diseño">
          <VistaAckermann batalla={giro.batalla} via={giro.via} viaTras={modelo.via.tras} maximo={limitarTriciclo('tGiro', T)} inicial={giro.dentro} />
          <GeometriaDelDiseno giro={giro} brazo={anguloBrazoAckermann(giro.batalla, giro.via)} cremallera={elegida?.id === 'cremallera'} />
        </Seccion>
        <Seccion titulo="Los ángulos del pivote y de la rueda" abierta nota="avance, inclinación, pivotamiento, convergencia, caída y bump steer">
          <div className="grid gap-3 md:grid-cols-2">
            {CONCEPTOS_DIRECCION.map(c => (
              <article key={c.id} className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-2.5">
                <h4 className="text-[13px] font-semibold text-slate-900">{c.titulo}</h4>
                <DibujoConcepto id={c.id} />
                <p className="text-xs leading-snug text-slate-700"><span className="font-medium">Qué es.</span> {c.queEs}</p>
                <p className="text-xs leading-snug text-slate-700"><span className="font-medium">Por qué importa.</span> {c.porQue}</p>
                {c.habitual && <p className="text-xs leading-snug text-slate-500"><span className="font-medium text-slate-600">Lo habitual.</span> {c.habitual}</p>}
              </article>))}
          </div>
          <p className="text-[11px] text-slate-500">Los dibujos son esquemas originales para esta pantalla, exagerados y sin escala. Las cifras «habituales» son de constructores de triciclos que las publican; son un punto de partida, no una norma.</p>
        </Seccion>
        <Seccion titulo="Las cuatro preguntas del estudio, contestadas con este diseño" nota="lo que el estudio pedía decidir y lo que el diseño ya dice">
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
            {PREGUNTAS_ESTUDIO.map(p => {
              const dato = p.clave === 'via' ? `vía delantera ${mm(giro.via)}` : p.clave === 'batalla' ? `distancia entre ejes ${mm(giro.batalla)}` : p.clave === 'mando' ? (giro.mando === 'volante' ? 'volante' : 'manillar')
                : (() => { const s = favoritaDe('suspension', P); return s === A_MEDIDA_RODAJE ? 'suspensión delantera «a medida» (sin elegir favorita)' : `suspensión delantera: ${opcionesDe('suspension').find(o => o.id === s)?.n ?? s}`; })();
              return <li key={p.q} className="flex flex-col gap-0.5 px-2.5 py-1.5"><span className="font-medium text-slate-800">{p.q}</span><span className="text-slate-500">El estudio propone: {p.opciones}</span><span className="text-teal-800">Este diseño: {dato}</span></li>; })}
          </ul>
        </Seccion>
        {elegida && (
          <Seccion titulo={`Plano de la favorita: ${elegida.n}`} abierta nota="vista desde arriba, acotado, descargable">
            <PlanoDireccion opcion={elegida} via={giro.via} batalla={giro.batalla} dentro={giro.dentro} mando={giro.mando} />
          </Seccion>)}
        {!elegida && <Seccion titulo="Plano de la favorita"><p className="text-xs text-slate-600">Cuando elijas una opción favorita con la estrella, aquí sale su plano: la vista desde arriba con la vía de este diseño, los brazos al ángulo de Ackermann y las cotas, para descargarlo.</p></Seccion>}
        <Seccion titulo="Materiales" nota="el estudio: qué se usa para cada pieza">
          <ul className="grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">{MATERIALES_DIRECCION.map(m => <li key={m.n} className="flex justify-between gap-3 border-b border-slate-100 py-0.5"><span className="font-medium text-slate-700">{m.n}</span><span className="text-right text-slate-600">{m.candidato}</span></li>)}</ul>
          <p className="text-xs leading-snug text-slate-600">{AVISO_MATERIALES}</p>
        </Seccion>
        <Seccion titulo="Lo que dice el estudio que pegaste" nota="resumido: objetivo, hipótesis y su valoración">
          <p className="text-xs text-slate-700"><span className="font-medium">Objetivo.</span> {OBJETIVO_ESTUDIO}</p>
          <ul className="list-disc pl-4 text-xs text-slate-700">{HIPOTESIS_ESTUDIO.map(h => <li key={h}>{h}</li>)}</ul>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-2 py-1 font-medium">&nbsp;</th>{COMPARATIVA_ESTUDIO.columnas.map(c => <th key={c} className="px-2 py-1 font-medium">{c}</th>)}</tr></thead>
              <tbody>{COMPARATIVA_ESTUDIO.filas.map(f => <tr key={f[0]} className="border-b border-slate-100 last:border-0"><th className="px-2 py-1 font-medium text-slate-600">{f[0]}</th>{f.slice(1).map((v, i) => <td key={i} className="px-2 py-1 text-slate-800">{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">{COMPARATIVA_ESTUDIO.aviso}</p>
        </Seccion>
      </>)}

      <Seccion titulo="Decisiones tomadas" abierta nota="queda guardado con el diseño">
        {decision ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-700">Última: <strong>{nombreOpcion(decision.opcion, decision.decision)}</strong>{decision.eje ? (decision.eje === 'todas' ? ' (las cuatro ruedas)' : decision.eje === 'del' ? ' (ruedas delanteras)' : ' (ruedas traseras)') : ''}, elegida el {decision.fecha}.</p>
            <Porque valor={decision.porque} alGuardar={v => set('decisionesRodaje', escribirPorque(P.decisionesRodaje, sub, v))} />
            {(P.decisionesRodaje?.[sub]?.length ?? 0) > 1 && (
              <ul className="text-[11px] text-slate-500">
                {[...(P.decisionesRodaje?.[sub] ?? [])].reverse().slice(1).map((d, i) => <li key={i}>{d.fecha}: {nombreOpcion(d.opcion, d.decision)}{d.porque ? ` — ${d.porque}` : ''}</li>)}
              </ul>)}
          </div>
        ) : <p className="text-xs text-slate-600">Todavía no se ha elegido ninguna. Cuando pulses una estrella, queda anotada aquí con la fecha, y puedes escribir por qué.</p>}
      </Seccion>
    </section>
  );
}

/** The steering's numbers for this design: what the model turns the wheels to, and what follows from them. */
function GeometriaDelDiseno({ giro, brazo, cremallera }: { giro: ReturnType<typeof datosGiro>; brazo: number; cremallera: boolean }) {
  const cir = circuloDeGiro(giro.dentro, giro.batalla, giro.via), ideal = fueraIdeal(giro.dentro, giro.batalla, giro.via);
  const filas: [string, string][] = [
    ['Vía delantera', mm(giro.via)], ['Distancia entre ejes', mm(giro.batalla)],
    ['Giro que pide el diseño: rueda de dentro', `${fmt(giro.dentro, 1)}°`], ['Rueda de fuera con Ackermann (la que usa el 3D)', `${fmt(giro.fuera, 1)}° (la fórmula da ${fmt(ideal, 1)}°)`],
    ['Radio de giro de la rueda de fuera', `${fmt(giro.radio, 1)} m`], ...(cir ? [['Círculo de giro (diámetro)', `${fmt(cir.diametro, 1)} m`] as [string, string]] : []),
    ['Brazos de dirección, para el 100 % de Ackermann', `${fmt(brazo, 1)}° con el eje del vehículo`],
    ...(cremallera ? [['Vueltas de volante de tope a tope con esa cremallera', `${fmt(relacionDeDireccion(CREMALLERA_GEMINI.vueltas, giro.dentro, giro.fuera).vueltasTopeATope, 2)} (relación ≈ ${fmt(relacionDeDireccion(CREMALLERA_GEMINI.vueltas, giro.dentro, giro.fuera).ratio, 0)} : 1)`] as [string, string]] : []),
  ];
  return <ul className="grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">{filas.map(([k, v]) => <li key={k} className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-0.5"><span className="text-slate-600">{k}</span><span className="shrink-0 text-right font-mono tabular-nums text-slate-900">{v}</span></li>)}</ul>;
}

/** The row of tabs under a department's tab (and its overview): where the part is chosen. Shown above the 3D view. A department with one part has no row. */
export function SubmenuPartes({ dep, sub, alElegir, P, precios }: { dep: string; sub: IdSub | 'resumen'; alElegir: (s: IdSub | 'resumen') => void; P: Parametros; precios: PreciosDiseno | null }) {
  const partes = partesDe(dep, P);
  if (partes.length < 2) return null;
  const botones: { id: IdSub | 'resumen'; n: string; extra?: string }[] = [
    { id: 'resumen', n: 'Resumen' },
    ...partes.map(s => { const n = numerosActuales(s.id, precios); return { id: s.id as IdSub, n: s.nombre, extra: n.partes.length ? `${fmt(n.kg, n.kg < 10 ? 1 : 0)} kg · ${eur(n.eur)}` : undefined }; }),
  ];
  const conFavorita = (id: IdSub) => id === 'ruedas' ? (() => { const f = favoritaDe('ruedas', P); return opcionesDe('ruedas').some(o => o.id === f.del || o.id === f.tras); })() : subsistema(id).origen === 'modelo' ? false : favoritaDe(id, P) !== A_MEDIDA_RODAJE;
  return (
    <nav aria-label={`Partes ${DE_DEP[dep as keyof typeof DE_DEP] ?? ''}`.trim()} className="mb-2 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {botones.map(b => { const activo = sub === b.id; return (
        <Button key={b.id} variant="ghost" aria-pressed={activo} onClick={() => alElegir(b.id)}
          className={cn('shrink-0 flex-col items-start gap-0 px-3 py-1.5 text-left text-xs normal-case tracking-normal', activo ? 'bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-700')}>
          <span className="flex items-center gap-1 font-semibold">{b.id !== 'resumen' && conFavorita(b.id as IdSub) && <Star className={cn('h-3 w-3', activo ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-600')} aria-label="con favorita" />}{b.n}</span>
          {b.extra && <span className={cn('font-mono text-[10px] tabular-nums', activo ? 'text-teal-100' : 'text-slate-500')}>{b.extra}</span>}
        </Button>); })}
    </nav>
  );
}

/** «Resumen» of a department: its parts, what each carries today and whether it has a favourite. */
export function ResumenPartes({ dep, P, precios, alElegir }: { dep: string; P: Parametros; precios: PreciosDiseno | null; alElegir: (s: IdSub) => void }) {
  const filas = partesDe(dep, P).map(s => {
    const n = numerosActuales(s.id, precios);
    const nombre = (id: string) => opcionesDe(s.id, P).find(o => o.id === id)?.n;
    let fav: string | null;
    if (s.origen === 'modelo') fav = elegidasDe(s.id, P).map(id => nombre(id)).filter(Boolean).join(' · ') || null;
    else if (s.id === 'ruedas') { const f = favoritaDe('ruedas', P); fav = f.del === f.tras ? (nombre(f.del) ?? null) : [nombre(f.del) && `delante: ${nombre(f.del)}`, nombre(f.tras) && `detrás: ${nombre(f.tras)}`].filter(Boolean).join(' · ') || null; }
    else { const f = favoritaDe(s.id, P); fav = f === A_MEDIDA_RODAJE ? null : nombre(f) ?? null; }
    return { s, n, fav };
  });
  const kg = filas.reduce((a, f) => a + f.n.kg, 0), e = filas.reduce((a, f) => a + f.n.eur, 0);
  return (
    <section aria-label={`${NOMBRE_DEP[dep as keyof typeof NOMBRE_DEP] ?? dep}: resumen`} className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="text-base font-semibold text-slate-900">{filas.length === 4 ? 'Las cuatro' : filas.length === 3 ? 'Las tres' : 'Las'} partes {DE_DEP[dep as keyof typeof DE_DEP] ?? ''}</h3>
      <p className="text-xs text-slate-600">Pulsa una para ver su 3D, sus opciones, sus datos y elegir la favorita con la estrella. Juntas pesan <strong>{fmt(kg, 1)} kg</strong> y cuestan <strong>{eur(e)}</strong> en este diseño.</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {filas.map(({ s, n, fav }) => (
          <li key={s.id}>
            <Button variant="outline" onClick={() => alElegir(s.id)} className="h-full w-full flex-col items-start gap-1 bg-white px-3 py-2 text-left normal-case tracking-normal">
              <span className="flex w-full items-baseline justify-between gap-2"><span className="text-sm font-semibold text-slate-900">{s.nombre}</span><span className="font-mono text-xs tabular-nums text-slate-700">{fmt(n.kg, 1)} kg · {eur(n.eur)}</span></span>
              <span className="text-xs font-normal text-slate-500">{s.lema}</span>
              <span className={cn('flex items-center gap-1 text-xs font-medium', fav ? 'text-amber-700' : 'text-slate-400')}><Star className={cn('h-3.5 w-3.5', fav && 'fill-amber-400')} />{fav ?? (s.origen === 'modelo' ? 'sin opciones activas' : `sin favorita: ${s.medida ?? 'el proyecto estima'}`)}</span>
            </Button>
          </li>))}
      </ul>
    </section>
  );
}
