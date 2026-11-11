// Where the money goes at each order of magnitude (Eugenio, 2026-11-11): the
// EU, Spain, the Comunidad de Madrid, Torrelodones, a block of flats and a
// family, each as a donut with its own items, plus one table that lines up the
// six categories he asked about (pensions, debt, education, health,
// infrastructure, defence) across every scale. Data: src/data/presupuestos.ts.
import { useState } from 'react';
import {
  PRESUPUESTOS, CATEGORIAS, type Categoria, type EscalaPresupuestoId, type Partida,
  totalEscala, cuotaCategoria, importe,
} from '../../data/presupuestos';
import { porcentaje } from '../../data/modeloSocioeconomico';
import { Fuente, Libre, Segmentado } from './piezas';

// Category colours are fixed, so «Sanidad» is the same green at every scale.
// Items without a category take the neutral-ish tones in order.
const TONO_CAT: Record<Categoria, { fill: string; bg: string }> = {
  pensiones: { fill: 'fill-amber-400', bg: 'bg-amber-400' },
  deuda: { fill: 'fill-rose-600', bg: 'bg-rose-600' },
  educacion: { fill: 'fill-sky-600', bg: 'bg-sky-600' },
  sanidad: { fill: 'fill-emerald-600', bg: 'bg-emerald-600' },
  infraestructuras: { fill: 'fill-indigo-500', bg: 'bg-indigo-500' },
  defensa: { fill: 'fill-slate-800', bg: 'bg-slate-800' },
};
const TONO_RESTO = { fill: 'fill-slate-300', bg: 'bg-slate-300' };
const TONO_AMORTIZACION = { fill: 'fill-rose-300', bg: 'bg-rose-300' };
const TONOS_OTROS = [
  { fill: 'fill-teal-500', bg: 'bg-teal-500' },
  { fill: 'fill-lime-600', bg: 'bg-lime-600' },
  { fill: 'fill-pink-400', bg: 'bg-pink-400' },
  { fill: 'fill-cyan-800', bg: 'bg-cyan-800' },
  { fill: 'fill-orange-300', bg: 'bg-orange-300' },
  { fill: 'fill-stone-400', bg: 'bg-stone-400' },
  { fill: 'fill-violet-300', bg: 'bg-violet-300' },
  { fill: 'fill-yellow-600', bg: 'bg-yellow-600' },
  { fill: 'fill-zinc-500', bg: 'bg-zinc-500' },
];

interface Porcion extends Partida { tono: { fill: string; bg: string } }

export function Presupuestos() {
  const [id, setId] = useState<EscalaPresupuestoId>('espana');
  const [conAmortizacion, setConAmortizacion] = useState(false);
  const [foco, setFoco] = useState<number | null>(null);
  const escala = PRESUPUESTOS.find(e => e.id === id)!;

  let otro = 0;
  // «Todo lo demás» stays grey: a remainder should not catch the eye.
  const porciones: Porcion[] = escala.partidas.map(p => ({
    ...p, tono: p.cat ? TONO_CAT[p.cat] : p.nombre === 'Todo lo demás' ? TONO_RESTO : TONOS_OTROS[otro++ % TONOS_OTROS.length],
  }));
  if (conAmortizacion && escala.amortizacion) {
    porciones.push({ nombre: 'Devolución de deuda (se refinancia)', euros: escala.amortizacion.euros, tono: TONO_AMORTIZACION, nota: escala.amortizacion.nota });
  }
  const total = porciones.reduce((s, p) => s + p.euros, 0);
  const enFoco = foco !== null ? porciones[foco] : null;

  const cambiar = (v: EscalaPresupuestoId) => { setId(v); setFoco(null); };

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Segmentado etiqueta="Escala del presupuesto" valor={id} onChange={cambiar}
          opciones={PRESUPUESTOS.map(e => ({ id: e.id, texto: e.nombre }))} />
        <p className="max-w-3xl text-[15px] leading-relaxed text-slate-600">
          {escala.que}{escala.estimado && ' Es un ejemplo, no una media oficial.'}<Fuente id={escala.fuente} />
        </p>
        {escala.amortizacion && (
          <label className="flex max-w-3xl cursor-pointer items-start gap-3 text-[15px] text-slate-700">
            <input type="checkbox" checked={conAmortizacion} onChange={e => { setConAmortizacion(e.target.checked); setFoco(null); }}
              className="mt-1 h-4 w-4 accent-slate-900" />
            <span>
              Sumar la deuda que se devuelve este año: {importe(escala.amortizacion.euros)}<Fuente id={escala.amortizacion.fuente} />.
              <span className="block text-sm text-slate-500">{escala.amortizacion.nota}</span>
            </span>
          </label>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Donut porciones={porciones} total={total} foco={foco} onFoco={setFoco}
          centro={enFoco ? { valor: porcentaje(enFoco.euros / total * 100), texto: enFoco.nombre } : { valor: importe(total), texto: 'en total al año' }} />

        <table className="w-full text-sm">
          <caption className="sr-only">Partidas del presupuesto: {escala.nombre}</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="py-2 pr-3 font-medium">Partida</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Al año</th>
              <th scope="col" className="py-2 text-right font-medium">Del total</th>
            </tr>
          </thead>
          <tbody>
            {porciones.map((p, i) => (
              <tr key={p.nombre} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}
                className={`border-b border-slate-100 align-top transition-colors ${foco === i ? 'bg-slate-50' : ''}`}>
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  <span className="flex items-start gap-2">
                    <span aria-hidden className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${p.tono.bg}`} />
                    <span>
                      <span className="font-medium text-slate-900">{p.nombre}</span>
                      {p.nota && <span className="block text-xs text-slate-500">{p.nota}</span>}
                    </span>
                  </span>
                </th>
                <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums text-slate-700">{importe(p.euros)}</td>
                <td className="whitespace-nowrap py-2.5 text-right font-semibold tabular-nums text-slate-900">{porcentaje(p.euros / total * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {escala.ausentes && <p className="max-w-3xl rounded-2xl bg-slate-100 p-5 text-[15px] leading-relaxed text-slate-700">{escala.ausentes}</p>}

      <Comparativa activa={id} onElegir={cambiar} />
    </div>
  );
}

/** A donut drawn by hand: one annular sector per item, a 2px white gap between them. */
function Donut({ porciones, total, foco, onFoco, centro }: {
  porciones: Porcion[]; total: number; foco: number | null; onFoco: (i: number | null) => void;
  centro: { valor: string; texto: string };
}) {
  const R = 96, r = 58, C = 100;
  let angulo = -Math.PI / 2;
  const punto = (rad: number, a: number) => `${C + rad * Math.cos(a)} ${C + rad * Math.sin(a)}`;
  return (
    <figure className="relative mx-auto w-full max-w-[22rem]">
      <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label={`Gráfico de quesitos: ${porciones.map(p => `${p.nombre} ${porcentaje(p.euros / total * 100)}`).join(', ')}`}>
        {porciones.map((p, i) => {
          const barrido = (p.euros / total) * Math.PI * 2;
          const a0 = angulo, a1 = angulo + barrido;
          angulo = a1;
          const grande = barrido > Math.PI ? 1 : 0;
          const d = barrido >= Math.PI * 2 - 1e-6
            ? `M ${punto(R, 0)} A ${R} ${R} 0 1 1 ${punto(R, Math.PI)} A ${R} ${R} 0 1 1 ${punto(R, 0)} M ${punto(r, 0)} A ${r} ${r} 0 1 0 ${punto(r, Math.PI)} A ${r} ${r} 0 1 0 ${punto(r, 0)} Z`
            : `M ${punto(R, a0)} A ${R} ${R} 0 ${grande} 1 ${punto(R, a1)} L ${punto(r, a1)} A ${r} ${r} 0 ${grande} 0 ${punto(r, a0)} Z`;
          return (
            <path key={p.nombre} d={d} fillRule="evenodd"
              className={`${p.tono.fill} stroke-white transition-opacity ${foco !== null && foco !== i ? 'opacity-35' : ''}`}
              strokeWidth={2} onMouseEnter={() => onFoco(i)} onMouseLeave={() => onFoco(null)} onClick={() => onFoco(foco === i ? null : i)} />
          );
        })}
      </svg>
      <figcaption className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[30%] text-center" aria-live="polite">
        <span className="text-xl font-bold leading-tight tabular-nums text-slate-900 sm:text-2xl">{centro.valor}</span>
        <span className="mt-0.5 text-xs leading-snug text-slate-600">{centro.texto}</span>
      </figcaption>
    </figure>
  );
}

/** The six categories across every scale, as a share of each budget. */
function Comparativa({ activa, onElegir }: { activa: EscalaPresupuestoId; onElegir: (id: EscalaPresupuestoId) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] rounded-2xl border border-slate-200 bg-white">
      <div className="px-5 pt-5">
        <h3 className="text-lg font-bold text-slate-900">Cada categoría en cada escala</h3>
        <p className="text-sm text-slate-500">Parte de cada presupuesto, sin contar la deuda que se refinancia. «—»: esa escala no paga eso. En el móvil, desliza la tabla.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Cada categoría en cada escala</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="px-5 py-2 font-medium">Categoría</th>
              {PRESUPUESTOS.map(e => (
                <th key={e.id} scope="col" className="px-3 py-2 text-right font-medium">
                  <Libre onClick={() => onElegir(e.id)} aria-pressed={e.id === activa}
                    className={`rounded px-1 text-right underline-offset-2 hover:underline ${e.id === activa ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                    {e.nombre}
                  </Libre>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS.map(c => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 text-left font-medium text-slate-900">
                  <span className="flex items-center gap-2"><span aria-hidden className={`h-3 w-3 shrink-0 rounded-sm ${TONO_CAT[c.id].bg}`} />{c.nombre}</span>
                </th>
                {PRESUPUESTOS.map(e => {
                  const v = cuotaCategoria(e, c.id);
                  return (
                    <td key={e.id} className={`px-3 py-2.5 text-right tabular-nums ${e.id === activa ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {v === null ? <span className="text-slate-400">—</span> : porcentaje(v * 100)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-5 py-2.5 text-left font-medium text-slate-500">Presupuesto total</th>
              {PRESUPUESTOS.map(e => <td key={e.id} className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-500">{importe(totalEscala(e))}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
