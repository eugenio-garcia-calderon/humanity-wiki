// Pieces of the «Escalas» window: today's split of public spending against the
// proposal's eight equal parts, the scale picker with each scale's
// responsibility, the «who takes care of…?» game and the up/down diagram.
// Scale colours come from ESCALAS (data), as in `Muestra`.
import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ESCALA, ESCALAS, OCTAVO, cuentasPais, euros, millones, porcentaje, type EscalaId } from '../../data/modeloSocioeconomico';
import { F, HOY_SUBSECTORES, HOY_TOTAL, RESPONSABILIDAD, TAREAS } from '../../data/escalas';
import { Fuente, Libre, Muestra } from './piezas';
import { Mas } from './ventanas';

const pais = cuentasPais('literal');

// ── Today vs proposal ───────────────────────────────────────────────────────
/** Two 100 % bars: who spends Spain's public money today, and the eight equal parts of the proposal. */
export function RepartoHoyPropuesta() {
  const hoy = HOY_SUBSECTORES.map(s => ({ ...s, pct: (s.millones / HOY_TOTAL) * 100 }));
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">Quién decide en qué se gasta cada 100 € públicos</figcaption>
      <p className="mt-1 text-sm text-slate-600">De la escala más cercana (izquierda) a la más lejana (derecha).</p>

      <p className="mt-5 text-sm font-semibold text-slate-900">Hoy, en España (2024)<Fuente id="igae-cofog" /></p>
      <div role="img" aria-label={`Hoy: ${hoy.map(s => `${s.nombre} ${porcentaje(s.pct)}`).join('; ')}`}
        className="mt-2 flex h-9 w-full gap-[2px] overflow-hidden rounded-[4px]">
        <div className="h-full w-[3px] bg-slate-200" title="Persona y comunidad vecinal: 0 %" />
        {hoy.map((s, i) => (
          <div key={s.id} className={cn('h-full', i === 3 && 'opacity-60')} style={{ width: `${s.pct}%`, backgroundColor: ESCALA[s.color].color }} title={`${s.nombre}: ${porcentaje(s.pct)}`} />
        ))}
      </div>
      <ul className="mt-2 grid gap-x-4 gap-y-1 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        {hoy.map((s, i) => (
          <li key={s.id} className="flex items-baseline gap-2">
            <Muestra color={ESCALA[s.color].color} className={cn('translate-y-0.5', i === 3 && 'opacity-60')} />
            <span><b className="tabular-nums">{porcentaje(s.pct)}</b> {s.nombre}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-slate-500">La persona y la comunidad vecinal: nada. Europa y el planeta reciben lo que el Estado decide aportar, y está dentro de su parte.</p>

      <p className="mt-6 text-sm font-semibold text-slate-900">Con la propuesta</p>
      <div role="img" aria-label="Con la propuesta: un octavo, el 12,5 %, para cada una de las ocho escalas"
        className="mt-2 flex h-9 w-full gap-[2px] overflow-hidden rounded-[4px]">
        {ESCALAS.map(e => <div key={e.id} className="h-full" style={{ width: `${OCTAVO * 100}%`, backgroundColor: e.color }} title={`${e.nombre}: 12,5 %`} />)}
      </div>
      <ol className="mt-2 hidden grid-cols-8 gap-x-2 text-xs text-slate-700 sm:grid">
        {ESCALAS.map(e => <li key={e.id} className="truncate">{e.corto}</li>)}
      </ol>
      <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700 sm:hidden">
        {ESCALAS.map(e => <li key={e.id} className="flex items-center gap-1"><Muestra color={e.color} className="h-2.5 w-2.5" />{e.corto}</li>)}
      </ol>
      <p className="mt-1 text-xs text-slate-500">12,5 % cada una. Las cuatro más cercanas, de la persona a la provincia, deciden la mitad.</p>
    </figure>
  );
}

// ── Pick a scale ────────────────────────────────────────────────────────────
export function FichasEscalas() {
  const [id, setId] = useState<EscalaId>('municipio');
  const e = ESCALA[id];
  const r = RESPONSABILIDAD[id];
  const i = ESCALAS.findIndex(x => x.id === id);
  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div role="group" aria-label="Elige una escala" className="flex flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap">
        {ESCALAS.map((x, k) => (
          <Libre key={x.id} onClick={() => setId(x.id)} aria-pressed={id === x.id}
            className={cn('flex items-center justify-start gap-2 rounded-full border px-3 py-1.5 text-left text-sm lg:rounded-xl lg:px-4 lg:py-2.5',
              id === x.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400')}>
            <span className="hidden w-4 text-xs tabular-nums opacity-60 lg:inline">{k + 1}</span>
            <Muestra color={x.color} />{x.corto}
          </Libre>
        ))}
      </div>

      <article aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-sm text-slate-500">Escala {i + 1} de 8 · {i === 0 ? 'la más cercana' : i === 7 ? 'la más lejana' : `entre ${ESCALAS[i - 1].corto.toLowerCase()} y ${ESCALAS[i + 1].corto.toLowerCase()}`}</p>
        <h3 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><Muestra color={e.color} className="h-4 w-4" />{e.nombre}</h3>
        <p className="mt-2 text-[17px] leading-relaxed text-slate-800"><b>Su responsabilidad:</b> {r.responde}</p>

        <dl className="mt-5 grid gap-4 text-[15px] leading-relaxed sm:grid-cols-2">
          <div><dt className="font-semibold text-slate-900">Qué recibe</dt>
            <dd className="text-slate-700">
              {id === 'persona'
                ? <>Unos {euros(pais.porPersonaEscala / 12)} al mes, {euros(pais.porPersonaEscala)} al año, cada persona desde que nace.</>
                : e.habitantesEjemplo
                  ? <>{euros(pais.porPersonaEscala)} al año por cada habitante. {e.ejemplo.split(' (')[0]}: unos {e.habitantesEjemplo > 10_000 ? millones((pais.porPersonaEscala * e.habitantesEjemplo) / 1e6) : euros(pais.porPersonaEscala * e.habitantesEjemplo)} al año.</>
                  : <>{euros(pais.porPersonaEscala)} al año por cada habitante; desde España, {millones(pais.porEscala)}.</>}
              {' '}<span className="text-slate-500">Estimación.</span>
            </dd></div>
          <div><dt className="font-semibold text-slate-900">Hoy lo hace</dt>
            <dd className="text-slate-700">{r.hoy}{r.hoyFuente && <Fuente url={F[r.hoyFuente].url} titulo={F[r.hoyFuente].titulo} />}</dd></div>
          <div><dt className="font-semibold text-slate-900">Quién decide</dt><dd className="text-slate-700">{e.participacion}</dd></div>
          <div><dt className="flex items-center gap-1 font-semibold text-slate-900"><ArrowUp aria-hidden className="h-4 w-4" />Lo que pasa a la escala de arriba</dt><dd className="text-slate-700">{r.sube}</dd></div>
        </dl>
        <Mas titulo="quién lo lleva a cabo y a quién ayuda">
          <dl className="grid gap-4 text-[15px] leading-relaxed sm:grid-cols-2">
            <div><dt className="font-semibold text-slate-900">Quién lo lleva a cabo</dt><dd className="text-slate-700">{e.comite}</dd></div>
            <div><dt className="flex items-center gap-1 font-semibold text-slate-900"><ArrowDown aria-hidden className="h-4 w-4" />A quién ayuda</dt><dd className="text-slate-700">{r.ayuda}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-slate-600"><b className="text-slate-800">Ejemplos de lo que da:</b> {e.devuelve}.</p>
        </Mas>
      </article>
    </div>
  );
}

// ── «Who takes care of…?» ───────────────────────────────────────────────────
export function QuienSeOcupa() {
  const [id, setId] = useState<string | null>(null);
  const t = TAREAS.find(x => x.id === id);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="font-bold text-slate-900">Pruébalo: ¿quién se ocupa de…?</p>
      <div role="group" aria-label="Elige una tarea" className="mt-3 flex flex-wrap gap-1.5">
        {TAREAS.map(x => (
          <Libre key={x.id} onClick={() => setId(x.id)} aria-pressed={id === x.id}
            className={cn('rounded-full border px-3 py-1.5 text-left text-[13px]',
              id === x.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400')}>
            {x.texto}
          </Libre>
        ))}
      </div>
      <div aria-live="polite" className="mt-4 min-h-[64px] rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-700">
        {t ? (
          <p><span className="inline-flex items-center gap-1.5 font-bold text-slate-900"><Muestra color={ESCALA[t.escala].color} />{ESCALA[t.escala].nombre}.</span> {t.porque}</p>
        ) : <p className="text-slate-500">Toca una de las tareas de arriba.</p>}
      </div>
    </div>
  );
}

// ── Up and down ─────────────────────────────────────────────────────────────
/** Tasks go up only when a closer scale cannot do them well; help comes down. */
export function SubeBaja() {
  const escalera = [...ESCALAS].reverse();
  return (
    <figure className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
      <figcaption className="sr-only">Las tareas suben de escala solo cuando la cercana no puede; la ayuda baja</figcaption>
      <ol className="space-y-1">
        {escalera.map(e => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900">
            <Muestra color={e.color} />{e.corto}
            <span className="w-full pl-5 text-xs font-normal text-slate-500 sm:ml-auto sm:w-auto sm:pl-0">{RESPONSABILIDAD[e.id].corta}</span>
          </li>
        ))}
      </ol>
      <div className="flex gap-4 text-sm sm:flex-col sm:justify-between sm:py-2">
        <p className="flex max-w-[11rem] items-start gap-1.5 text-slate-700"><ArrowUp aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" /><span><b>Sube</b> la tarea, solo si la escala de abajo no puede hacerla bien</span></p>
        <p className="flex max-w-[11rem] items-start gap-1.5 text-slate-700"><ArrowDown aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" /><span><b>Baja</b> la ayuda: préstamos sin intereses (solo ajustados a la subida de precios), donaciones puntuales y técnicos</span></p>
      </div>
    </figure>
  );
}
