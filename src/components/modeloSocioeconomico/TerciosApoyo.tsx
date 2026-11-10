// Two rules Eugenio added on 2026-11-10, second round:
//   · every scale splits what it receives in thirds: produce, care, free;
//   · help goes from a larger scale to a smaller one (or between equals) as
//     loans at the CPI and one-off donations, work comes before allowances, and
//     only people with a disability get a constant support, in kind if possible.
import { ArrowDown, ArrowLeftRight } from 'lucide-react';
import {
  APOYOS, ESCALAS, HOY, TERCIOS, TERCIOS_ESCALA, type Modo, cuentasPais, euros, millones, numero, porcentaje,
} from '../../data/modeloSocioeconomico';
import { Fuente, Muestra } from './piezas';

export function Tercios({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const tercio = pais.porEscala / 3;
  return (
    <div className="space-y-6">
      <ol className="grid gap-4 md:grid-cols-3">
        {TERCIOS.map((t, i) => (
          <li key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-1" aria-hidden>
              {[0, 1, 2].map(k => <span key={k} className={`h-2.5 w-8 rounded-sm ${k === i ? 'bg-slate-900' : 'bg-slate-200'}`} />)}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{t.id === 'libre' ? 'Un tercio libre' : `Un tercio para ${t.corto.toLowerCase()}`}: {t.nombre.toLowerCase()}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{t.texto}</p>
            <p className="mt-3 text-sm tabular-nums text-slate-700">
              {millones(tercio)} al año en cada escala, {euros(pais.porPersonaEscala / 3)} por habitante.
            </p>
          </li>
        ))}
      </ol>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="px-5 pt-5 text-left text-lg font-bold text-slate-900">Qué es cada tercio en cada escala</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="px-5 py-2 font-medium">Escala</th>
              {TERCIOS.map(t => <th key={t.id} scope="col" className="px-4 py-2 font-medium">{t.nombre}</th>)}
            </tr>
          </thead>
          <tbody>
            {ESCALAS.map(e => (
              <tr key={e.id} className="border-b border-slate-100 align-top last:border-0">
                <th scope="row" className="whitespace-nowrap px-5 py-2.5 text-left font-semibold text-slate-900">
                  <span className="flex items-center gap-2"><Muestra color={e.color} />{e.corto}</span>
                </th>
                {TERCIOS.map(t => <td key={t.id} className="px-4 py-2.5 leading-snug text-slate-700">{TERCIOS_ESCALA[e.id][t.id]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
        En la persona, la regla también vale: de su dividendo de {euros(pais.porPersonaEscala)} al año, {euros(pais.porPersonaEscala / 3)} van a sus participaciones
        en lo que produce, {euros(pais.porPersonaEscala / 3)} a cuidados y {euros(pais.porPersonaEscala / 3)} los usa como quiera. Los quince ámbitos de la matriz dicen
        en qué se gasta todo el dinero de cada escala, sus tres tercios juntos; los tercios dicen para qué: una escuela infantil es cuidado, sus paneles solares son producción. Por eso, cuando la página habla de lo que tienen las escalas para servicios, un tercio es en realidad inversión.
      </p>
    </div>
  );
}

export function AyudaEntreEscalas({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  // Care thirds of the five collective scales inside Spain (neighbourhood to nation).
  const cuidados = (pais.recaudacion * 5) / 8 / 3;
  const incapacidadHoy = HOY.nominaIncapacidadMes * 14;
  const prestamo = 10_000;
  const escalera = [...ESCALAS].reverse();
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
      <figure className="rounded-2xl border border-slate-200 bg-white p-5">
        <figcaption className="text-sm font-semibold text-slate-900">La ayuda baja de una escala a la más cercana</figcaption>
        <ol className="mt-4">
          {escalera.map((e, i) => (
            <li key={e.id}>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900">
                <Muestra color={e.color} />{e.corto}
                {e.id === 'vecindad' && <span className="ml-auto flex items-center gap-1 text-xs font-normal text-slate-600"><ArrowLeftRight aria-hidden className="h-3.5 w-3.5" />y entre familias</span>}
                {e.id === 'municipio' && <span className="ml-auto flex items-center gap-1 text-xs font-normal text-slate-600"><ArrowLeftRight aria-hidden className="h-3.5 w-3.5" />y entre pueblos</span>}
              </div>
              {i < escalera.length - 1 && (
                <div className="flex items-center gap-2 py-0.5 pl-4 text-xs text-slate-500">
                  <ArrowDown aria-hidden className="h-3.5 w-3.5 text-slate-400" />
                  {i === 0 ? 'préstamos al IPC y donaciones puntuales' : i === escalera.length - 2 ? 'y del hogar a cada persona' : ''}
                </div>
              )}
            </li>
          ))}
        </ol>
      </figure>

      <div className="space-y-5">
        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {APOYOS.map(a => (
            <li key={a.id} className="border-l-2 border-slate-300 pl-4">
              <h3 className="font-bold text-slate-900">{a.nombre}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{a.texto}</p>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-slate-50 p-5 text-[15px] leading-relaxed text-slate-700">
          <p>
            <b>Un préstamo al IPC, con la cifra de hoy.</b> El IPC está en el {porcentaje(HOY.ipc)}<Fuente id="ipc-2026" />: quien recibe {euros(prestamo)} devuelve {euros(prestamo * (1 + HOY.ipc / 100))} al cabo
            de un año, que compran lo mismo que los {euros(prestamo)} de hoy. Quien presta no pierde ni gana.
          </p>
          <p className="mt-3">
            <b>Discapacidad, en especie.</b> Hay {numero(HOY.discapacidadReconocida / 1e6, 1)} millones de personas con una discapacidad reconocida de al menos el 33 %<Fuente id="imserso-discapacidad" />.
            Los tercios de cuidados de las cinco escalas de España, de la comunidad vecinal a la nación, suman {millones(cuidados)} al año; hoy las pensiones de incapacidad permanente cuestan unos {millones(incapacidadHoy)}<Fuente id="pensiones-2026" />.
          </p>
          <p className="mt-3">
            <b>Sin pensiones constantes.</b> Hoy se pagan {numero(HOY.pensionesContributivas / 1e6, 1)} millones de pensiones contributivas, {millones(HOY.nominaPensionesMes)} cada mes<Fuente id="pensiones-2026" />.
            En el modelo, la vejez se sostiene con lo que cada persona ahorra e invierte, su familia, su comunidad, su municipio y un trabajo u ocupación;
            quien llega a tener una discapacidad, con el apoyo en especie. Cómo se pasa de un sistema a otro está en «Lo que falta por resolver».
          </p>
        </div>
      </div>
    </div>
  );
}
