// The «Categorías» window (Eugenio, 2026-11-12): «una ventana que indique qué
// entra dentro de lo básico, lo secundario, lo ocioso y lo lujoso, para que
// sepamos en cada sector en qué categoría entra». A look-up list with a search
// box, the four questions that place anything not on the list, and the cases
// where the line is debatable. Data: src/data/categorias.ts.
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { TRAMOS, porcentaje, type Tramo } from '../../data/modeloSocioeconomico';
import { CASOS_FRONTERA, CRITERIOS, SECTORES, UMBRALES } from '../../data/categorias';
import { Apartado, Mas } from './ventanas';
import { Libre, Segmentado } from './piezas';
import { TONO_TRAMO } from './Tramos';
import { cn } from '../../utils/cn';

type Filtro = 'todos' | `${Tramo}`;

/** Lower case without accents, so «energia» finds «Energía». */
const plano = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function CategoriasVentana() {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const visibles = useMemo(() => {
    const q = plano(busca.trim());
    return SECTORES.filter(s => (filtro === 'todos' || `${s.tramo}` === filtro) && (!q || plano(`${s.nombre} ${s.ejemplos}`).includes(q)));
  }, [filtro, busca]);

  const irA = (t: Tramo) => {
    setFiltro(`${t}`);
    setBusca('');
    document.getElementById('categorias-sectores')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Apartado id="categorias" titulo="Qué es básico, secundario, ocio o lujo"
        entradilla={<>Cada compra que hace una persona paga según lo que compra. Aquí está, sector por sector, en qué categoría entra cada cosa, y cómo decidirlo cuando algo no está en la lista.</>}>
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TRAMOS.map(t => {
            const n = SECTORES.filter(s => s.tramo === t.id).length;
            const criterio = CRITERIOS.find(c => c.tramo === t.id)!;
            return (
              <li key={t.id}>
                <Libre onClick={() => irA(t.id)}
                  className="flex h-full w-full flex-col items-stretch justify-start rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-slate-400">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-lg font-bold text-slate-900">{t.nombre}</span>
                    <span className={cn('rounded-lg px-2.5 py-1 text-xl font-[800] tabular-nums', TONO_TRAMO[t.id])}>{porcentaje(t.tipo * 100, 0)}</span>
                  </span>
                  <span className="mt-2 block text-[15px] font-medium leading-snug text-slate-800">{criterio.pregunta}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">{t.compras}.</span>
                  <span className="mt-auto pt-3 text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4">Ver sus {n} sectores</span>
                </Libre>
              </li>
            );
          })}
        </ol>
      </Apartado>

      <Apartado id="categorias-sectores" titulo="Cada sector, en su categoría" fondo="blanco"
        entradilla="Busca lo que compras o elige una categoría.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Buscar un sector o un producto</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Por ejemplo: gimnasio, gafas, reloj…"
              className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20" />
          </label>
          <Segmentado<Filtro> etiqueta="Categoría" valor={filtro} onChange={setFiltro}
            opciones={[{ id: 'todos', texto: 'Todas' }, ...TRAMOS.map(t => ({ id: `${t.id}` as Filtro, texto: `${t.corto} ${porcentaje(t.tipo * 100, 0)}` }))]} />
        </div>

        {visibles.length === 0 ? (
          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-slate-700">
            No está en la lista. Usa las cuatro preguntas de abajo para saber en qué categoría entra, y si crees que falta, propónlo con el botón «Proponer una mejora».
          </p>
        ) : (
          <div className="mt-7 space-y-8">
            {TRAMOS.filter(t => visibles.some(s => s.tramo === t.id)).map(t => (
              <section key={t.id} aria-labelledby={`cat-${t.id}`}>
                <h3 id={`cat-${t.id}`} className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className={cn('rounded-md px-2 py-0.5 text-sm font-[800] tabular-nums', TONO_TRAMO[t.id])}>{porcentaje(t.tipo * 100, 0)}</span>{t.nombre}
                </h3>
                <ul className="mt-3 grid gap-x-6 gap-y-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
                  {visibles.filter(s => s.tramo === t.id).map(s => (
                    <li key={s.id} className="bg-white px-4 py-3">
                      <p className="font-semibold text-slate-900">{s.nombre}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.ejemplos}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Apartado>

      <Apartado id="categorias-decidir" titulo="Cómo decidir lo que no está en la lista"
        entradilla="Cuatro preguntas, en este orden. La primera a la que respondes que sí te da la categoría.">
        <ol className="grid max-w-3xl gap-3">
          {CRITERIOS.map((c, i) => {
            const t = TRAMOS.find(x => x.id === c.tramo)!;
            return (
              <li key={c.tramo} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{c.pregunta}</p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-slate-600">{c.explica}</p>
                  <p className="mt-2 text-sm"><span className={cn('rounded-md px-2 py-0.5 font-bold', TONO_TRAMO[t.id])}>{t.nombre}, {porcentaje(t.tipo * 100, 0)}</span></p>
                </div>
              </li>
            );
          })}
        </ol>

        <Mas titulo="los casos dudosos">
          <dl className="grid max-w-3xl gap-4">
            {CASOS_FRONTERA.map(c => (
              <div key={c.t}>
                <dt className="font-semibold text-slate-900">{c.t}</dt>
                <dd className="mt-0.5 text-[15px] leading-relaxed text-slate-600">{c.d}</dd>
              </div>
            ))}
          </dl>
        </Mas>

        <Mas titulo="dónde empieza el lujo">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Lo que separa lo secundario o el ocio del lujo es el precio: a partir de cierta cantidad se paga sobre todo la marca. Estos umbrales son una propuesta para empezar; los fijaría cada año la asamblea nacional y se publicarían junto a esta lista.
          </p>
          <table className="mt-4 w-full max-w-xl text-[15px]">
            <caption className="sr-only">Umbrales propuestos a partir de los cuales una compra es lujo</caption>
            <tbody>
              {UMBRALES.map(u => (
                <tr key={u.t} className="border-b border-slate-200 last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-900">{u.t}</th>
                  <td className="py-2 text-slate-700">{u.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Mas>
      </Apartado>
    </>
  );
}
