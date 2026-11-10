// Who decides at each scale: a citizens' assembly chooses the priorities, a
// technical committee carries them out at the lowest cost, most effectively and
// most ecologically, and the accounts are open so the next round of priorities
// starts from what actually happened.
import { ESCALAS } from '../../data/modeloSocioeconomico';
import { Muestra } from './piezas';

const CICLO = [
  { t: 'Se recauda', d: 'Cada pago aparta su tramo (0, 20 o 40 %) al instante.' },
  { t: 'Se reparte', d: 'Un octavo a cada escala, lo mismo por habitante, y en cada escala en tres tercios: producir, cuidar y libre.' },
  { t: 'La asamblea elige', d: 'Las personas votan las prioridades: qué importa más este año, dentro de cada tercio.' },
  { t: 'El comité diseña', d: 'Busca la manera más barata, eficaz y ecológica de cumplirlas.' },
  { t: 'Se ejecuta', d: 'Obras, servicios, préstamos al IPC y donaciones puntuales, con contratos públicos y abiertos.' },
  { t: 'Se rinde cuentas', d: 'Cada euro y cada resultado, a la vista. Y vuelta a empezar.' },
];

const HERRAMIENTAS = [
  'Análisis de coste y beneficio de cada alternativa',
  'Huella de carbono, agua y materiales de cada proyecto',
  'Indicadores públicos de resultados, como los de humanity.wiki',
  'Datos abiertos y contratación transparente',
  'Evaluación externa al terminar cada proyecto',
];

const VALORES = [
  'Lo que se puede hacer cerca, se hace cerca',
  'Primero lo que más mejora la vida de quien está peor',
  'Cuidar de las generaciones que vienen',
  'Gastar cada euro como si fuera propio',
  'Todo a la vista de todas las personas',
];

export function QuienDecide() {
  return (
    <div className="space-y-10">
      <ol className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-6">
        {CICLO.map((p, i) => (
          <li key={p.t} className="relative bg-white p-4">
            <span className="text-3xl font-[750] tabular-nums text-slate-300">{i + 1}</span>
            <h3 className="mt-1 font-bold text-slate-900">{p.t}</h3>
            <p className="mt-1 text-sm leading-snug text-slate-600">{p.d}</p>
            {i === CICLO.length - 1 && <p className="mt-2 text-xs font-semibold text-slate-900">↺ vuelve al paso 3</p>}
          </li>
        ))}
      </ol>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th scope="col" className="px-4 py-3 font-semibold text-slate-900">Escala</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-900">Quién elige las prioridades</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-900">Quién las ejecuta</th>
              <th scope="col" className="px-4 py-3 font-semibold text-slate-900">Cada cuánto</th>
            </tr>
          </thead>
          <tbody>
            {ESCALAS.map(e => (
              <tr key={e.id} className="border-b border-slate-100 align-top last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-slate-900"><span className="flex items-center gap-2"><Muestra color={e.color} />{e.nombre}</span></th>
                <td className="px-4 py-3 text-slate-700">{e.participacion}</td>
                <td className="px-4 py-3 text-slate-700">{e.comite}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">{e.ritmo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">Las herramientas del comité técnico</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700">{HERRAMIENTAS.map(h => <li key={h}>{h}</li>)}</ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">Los valores con los que decide</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700">{VALORES.map(h => <li key={h}>{h}</li>)}</ul>
          <p className="mt-4 text-sm text-slate-500">La asamblea decide el qué; el comité, el cómo. Si el comité no consigue lo que se le pidió, la asamblea lo cambia.</p>
        </div>
      </div>
    </div>
  );
}
