// The matrix: eight scales × fifteen areas. Each cell says what that scale is
// responsible for in that area and what its money is spent on. Read it three
// ways: a cell (one scale, one area), a row (where one scale's money goes) or a
// column (the same area from the staircase to the planet).
import { useMemo, useState } from 'react';
import { cn } from '../../utils/cn';
import {
  AMBITOS, AMBITO, ESCALAS, ESCALA, MATRIZ, type AmbitoId, type EscalaId, type Modo,
  cuentasPais, euros, millones, numero, ESPANA,
} from '../../data/modeloSocioeconomico';
import { Libre, Muestra, Segmentado } from './piezas';

type Unidad = 'pct' | 'persona' | 'pais';
type Foco = { escala: EscalaId; ambito: AmbitoId } | { escala: EscalaId; ambito?: undefined } | { ambito: AmbitoId; escala?: undefined };

export function MatrizAmbitos({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const [unidad, setUnidad] = useState<Unidad>('pct');
  const [foco, setFoco] = useState<Foco>({ escala: 'municipio', ambito: 'clima' });

  const valor = (escala: EscalaId, ambito: AmbitoId) => {
    const p = MATRIZ[escala][ambito].peso;
    if (p == null) return null;
    if (unidad === 'pct') return `${p} %`;
    if (unidad === 'persona') return euros((pais.porPersonaEscala * p) / 100);
    return millones((pais.porEscala * p) / 100);
  };

  const maxPeso = useMemo(() => Math.max(...ESCALAS.flatMap(e => AMBITOS.map(a => MATRIZ[e.id][a.id].peso ?? 0))), []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm text-slate-600">Mostrar cada celda como</span>
        <Segmentado<Unidad> etiqueta="Unidad de la matriz" valor={unidad} onChange={setUnidad} opciones={[
          { id: 'pct', texto: '% del presupuesto de la escala' },
          { id: 'persona', texto: '€ por persona y año' },
          { id: 'pais', texto: '€ al año en España' },
        ]} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white [scrollbar-width:thin]">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">Responsabilidades e inversión de cada escala en cada ámbito</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-20 w-[150px] bg-white px-3 pb-2 pt-3 text-left text-xs font-medium text-slate-500">Escala \ Ámbito</th>
              {AMBITOS.map(a => (
                <th key={a.id} scope="col" className="px-0.5 pb-2 pt-3 align-bottom">
                  <Libre
                    onClick={() => setFoco({ ambito: a.id })}
                    aria-pressed={!foco.escala && foco.ambito === a.id}
                    className={cn('w-full rounded-md px-1 py-1 text-center text-[12px] font-semibold leading-tight text-slate-700 hover:bg-slate-100',
                      foco.ambito === a.id && !foco.escala && 'bg-slate-900 text-white hover:bg-slate-900')}
                    title={`Ver ${a.nombre} en las ocho escalas`}
                  >{a.corto}</Libre>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ESCALAS.map(e => (
              <tr key={e.id}>
                <th scope="row" className="sticky left-0 z-10 bg-white px-2 py-0.5 text-left">
                  <Libre
                    onClick={() => setFoco({ escala: e.id })}
                    aria-pressed={foco.escala === e.id && !foco.ambito}
                    className={cn('flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-[13px] font-semibold text-slate-800 hover:bg-slate-100',
                      foco.escala === e.id && !foco.ambito && 'bg-slate-900 text-white hover:bg-slate-900')}
                    title={`Ver adónde va el dinero de ${e.nombre}`}
                  >
                    <Muestra color={e.color} /> {e.corto}
                  </Libre>
                </th>
                {AMBITOS.map(a => {
                  const celda = MATRIZ[e.id][a.id];
                  const p = celda.peso;
                  const intensidad = p == null ? 0.14 : 0.1 + 0.85 * (p / maxPeso);
                  const oscuro = p != null && intensidad > 0.5;
                  const sel = foco.escala === e.id && foco.ambito === a.id;
                  const enFoco = (foco.escala === e.id && !foco.ambito) || (foco.ambito === a.id && !foco.escala);
                  return (
                    <td key={a.id} className="p-0.5">
                      <Libre
                        onClick={() => setFoco({ escala: e.id, ambito: a.id })}
                        aria-pressed={sel}
                        aria-label={`${e.nombre}, ${a.nombre}: ${celda.responsabilidad}${p != null ? `, ${p} % de su presupuesto` : ''}`}
                        className={cn('relative flex h-11 w-full items-center justify-center overflow-hidden rounded-md text-[12px] tabular-nums transition-shadow',
                          sel && 'ring-2 ring-slate-900 ring-offset-1', enFoco && !sel && 'ring-1 ring-slate-900/50')}
                      >
                        {/* The fill is the scale's colour (data) with the share as opacity. */}
                        <span aria-hidden className="absolute inset-0" style={{ backgroundColor: e.color, opacity: intensidad }} />
                        <span className={cn('relative font-semibold', p == null ? 'text-[11px] font-medium text-slate-700' : oscuro ? 'text-white' : 'text-slate-900')}>
                          {p == null ? 'libre' : valor(e.id, a.id)}
                        </span>
                      </Libre>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Pulsa una celda, el nombre de una escala o el de un ámbito. Cuanto más intenso el color, mayor la parte del presupuesto de esa escala.
        En la fila de la persona pone «libre»: su dividendo es suyo y decide ella.
      </p>

      <Detalle foco={foco} modo={modo} onFoco={setFoco} />
    </div>
  );
}

function Detalle({ foco, modo, onFoco }: { foco: Foco; modo: Modo; onFoco: (f: Foco) => void }) {
  const pais = cuentasPais(modo);

  // A whole scale: where its money goes.
  if (foco.escala && !foco.ambito) {
    const e = ESCALA[foco.escala];
    const filas = AMBITOS.map(a => ({ a, c: MATRIZ[e.id][a.id] })).sort((x, y) => (y.c.peso ?? 0) - (x.c.peso ?? 0));
    return (
      <section aria-live="polite" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Muestra color={e.color} className="h-4 w-4" />{e.nombre}: adónde va su dinero</h3>
        <p className="mt-1 max-w-3xl text-slate-600">{e.recibe}. {e.id === 'persona' ? 'Nadie le dice en qué gastarlo.' : `Recibe ${millones(pais.porEscala)} al año en toda España, ${euros(pais.porPersonaEscala)} por habitante.`}</p>
        <ul className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">
          {filas.map(({ a, c }) => (
            <li key={a.id}>
              <Libre onClick={() => onFoco({ escala: e.id, ambito: a.id })} className="group block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{a.nombre}</span>
                  <span className="tabular-nums text-slate-600">{c.peso == null ? 'libre' : `${c.peso} % · ${euros((pais.porPersonaEscala * c.peso) / 100)}/persona`}</span>
                </span>
                {c.peso != null && (
                  <span className="mt-1 block h-1.5 rounded-full bg-slate-100">
                    <span className="block h-1.5 rounded-full" style={{ width: `${(c.peso / 30) * 100}%`, maxWidth: '100%', backgroundColor: e.color }} />
                  </span>
                )}
                <span className="mt-1 block text-[13px] text-slate-600">{c.responsabilidad}</span>
              </Libre>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // One area across the eight scales (and, if a cell was chosen, that cell first).
  const ambito = AMBITO[foco.ambito!];
  const sel = foco.escala ? ESCALA[foco.escala] : null;
  const celda = sel ? MATRIZ[sel.id][ambito.id] : null;
  return (
    <section aria-live="polite" className="mt-6 grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 lg:grid-cols-[1.1fr_1fr]">
      {sel && celda ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><Muestra color={sel.color} />{sel.nombre}</p>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-slate-900">{ambito.nombre}: {celda.responsabilidad.toLowerCase()}</h3>
          <p className="mt-4 text-sm font-semibold text-slate-700">En qué se invierte</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
            {celda.inversiones.map(i => <li key={i}>{i}</li>)}
          </ul>
          {celda.peso != null ? (
            <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-slate-500">Parte de su presupuesto</dt><dd className="text-xl font-bold tabular-nums text-slate-900">{celda.peso} %</dd></div>
              <div><dt className="text-slate-500">Por persona y año</dt><dd className="text-xl font-bold tabular-nums text-slate-900">{euros((pais.porPersonaEscala * celda.peso) / 100)}</dd></div>
              <div><dt className="text-slate-500">En toda España</dt><dd className="text-xl font-bold tabular-nums text-slate-900">{millones((pais.porEscala * celda.peso) / 100)}</dd></div>
            </dl>
          ) : (
            <p className="mt-5 text-sm text-slate-600">El dividendo individual ({euros(pais.porPersonaEscala)} al año) es libre: estas son responsabilidades de cada persona, no partidas obligatorias.</p>
          )}
          {sel.id === 'municipio' && celda.peso != null && (
            <p className="mt-3 text-sm text-slate-600">En el pueblo de 400 habitantes del ejemplo, esta partida son {euros((pais.porPersonaEscala * 400 * celda.peso) / 100)} al año.</p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-slate-500">Un ámbito, ocho escalas</p>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-slate-900">{ambito.nombre}, de lo cercano a lo global</h3>
          <p className="mt-2 text-slate-600">
            Cada escala hace solo lo que no puede hacerse mejor más cerca. Así se reparte {ambito.nombre.toLowerCase()} entre todas:
            {(() => {
              const total = ESCALAS.reduce((s, e) => s + ((MATRIZ[e.id][ambito.id].peso ?? 0) / 100) * pais.porEscala, 0);
              return <> en total, {millones(total)} al año en España ({euros((total * 1e6) / ESPANA.poblacion)} por habitante), sin contar lo que cada persona decida con su dividendo.</>;
            })()}
          </p>
        </div>
      )}
      <ol className="space-y-1.5">
        {ESCALAS.map(e => {
          const c = MATRIZ[e.id][ambito.id];
          return (
            <li key={e.id}>
              <Libre onClick={() => onFoco({ escala: e.id, ambito: ambito.id })}
                aria-pressed={sel?.id === e.id}
                className={cn('flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50', sel?.id === e.id && 'bg-slate-100')}>
                <Muestra color={e.color} className="mt-1" />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2 text-sm"><span className="font-semibold text-slate-900">{e.corto}</span>
                    <span className="tabular-nums text-slate-500">{c.peso == null ? 'libre' : `${numero(c.peso)} %`}</span></span>
                  <span className="block text-[13px] leading-snug text-slate-600">{c.responsabilidad}</span>
                </span>
              </Libre>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

