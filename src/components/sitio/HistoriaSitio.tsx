import { Link } from 'react-router-dom';
import { History, Sparkles, ArrowUpRight } from 'lucide-react';
import { miniatura } from '../../utils/miniatura';
import { anosDe, fotoPropia, type DatosPortada, type ProyectoPortada } from './portadaEscaparate';

// ============================================================================
// «NUESTRA HISTORIA» (2026-11-07, portada de luzhumanidad.com)
// ============================================================================
// Los proyectos del laboratorio por el año en que empezaron (su «Fecha Inicio» en
// la tabla), del primero al último, cada uno con su enlace. Se pinta solo: un
// proyecto nuevo con su fecha aparece en su año sin tocar nada. Encima pueden ir
// unos pocos hitos escritos a mano (`config.sitio.historia` de la raíz), y cada
// uno con su fuente a la vista; sin fuente no se enseñan (`seoEscaparate.ts`).

export default function HistoriaSitio({ datos, enlace }: { datos: DatosPortada; enlace: (p: ProyectoPortada) => string }) {
  const anos = anosDe(datos.proyectos);
  if (anos.length < 2) return null;
  const porAno = new Map<number, ProyectoPortada[]>();
  for (const p of datos.proyectos) {
    const a = Number(p.ano);
    if (a) porAno.set(a, [...(porAno.get(a) || []), p]);
  }
  const hitos = new Map<number, DatosPortada['historia']>();
  for (const h of datos.historia || []) hitos.set(Number(h.ano), [...(hitos.get(Number(h.ano)) || []), h]);
  // Los años con proyectos o con algún hito, en orden.
  const filas = [...new Set([...porAno.keys(), ...hitos.keys()])].sort((a, b) => a - b);
  const conAno = [...porAno.values()].reduce((n, ps) => n + ps.length, 0);

  return (
    <section data-ancla="historia" aria-labelledby="titulo-historia" className="mt-20 scroll-mt-36 outline-none sm:scroll-mt-24">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-500"><History className="h-3.5 w-3.5" aria-hidden /> Nuestra historia</p>
        <h2 id="titulo-historia" className="mx-auto mt-2 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Cómo ha crecido el laboratorio</h2>
        <p className="mt-3 text-sm font-semibold text-slate-500">{conAno} proyectos · {anos[0]}–{anos[anos.length - 1]}</p>
      </div>

      <ol role="list" className="mx-auto mt-10 max-w-5xl list-none py-0 pl-2 pr-0 sm:pl-0">
        {filas.map((ano, i) => {
          const ps = porAno.get(ano) || [];
          const ultimo = i === filas.length - 1;
          const cuantos = ps.length > 0 ? `${ps.length} ${ps.length === 1 ? 'proyecto' : 'proyectos'}` : '';
          return (
            <li key={ano} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-7">
              {/* El año: a la izquierda de la línea en el ordenador; en el móvil, encima de sus proyectos. */}
              <div className="hidden pt-0.5 text-right sm:block">
                <p className="text-[1.75rem] font-black leading-none tracking-tight tabular-nums text-slate-900">{ano}</p>
                {cuantos && <p className="mt-1 text-xs font-bold text-slate-500">{cuantos}</p>}
              </div>
              {/* La línea del tiempo: un punto por año y el hilo que los une, del primero al último. */}
              <div className={`relative pl-6 sm:pl-8 ${ultimo ? '' : 'pb-6 sm:pb-8'}`}>
                {filas.length > 1 && (
                  <span aria-hidden className={`absolute left-0 w-0.5 bg-slate-200 ${i === 0 ? 'bottom-0 top-3' : ultimo ? 'top-0 h-3' : 'inset-y-0'}`} />
                )}
                <span aria-hidden className="absolute -left-[6px] top-[5px] h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400 shadow-[0_0_0_1px_rgba(217,119,6,0.4)]" />
                <p className="mb-2 flex items-baseline gap-2 sm:hidden">
                  <span className="text-xl font-black leading-none tracking-tight tabular-nums text-slate-900">{ano}</span>
                  {cuantos && <span className="text-xs font-bold text-slate-500">{cuantos}</span>}
                </p>
                {ps.length > 0 && (
                  <ul role="list" className="flex list-none flex-wrap gap-1.5 p-0 sm:gap-2">
                    {ps.map(p => (
                      <li key={p.pagina} className="max-w-full">
                        <Link to={enlace(p)} data-interno="" title={p.descripcion || undefined}
                          className="group inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm outline-none transition-colors hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-amber-500 sm:pr-3.5">
                          {fotoPropia(p.portada)
                            ? <img src={miniatura(fotoPropia(p.portada), 32)} alt="" loading="lazy" decoding="async" className="h-6 w-6 shrink-0 rounded-full object-cover sm:h-7 sm:w-7" />
                            : <span aria-hidden className="h-6 w-6 shrink-0 rounded-full bg-slate-100 sm:h-7 sm:w-7" />}
                          <span className="truncate text-[13px] font-bold text-slate-700 group-hover:text-slate-950">{p.titulo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {(hitos.get(ano) || []).map(h => (
                  <p key={h.texto} className="mt-3 flex max-w-2xl gap-2 text-sm leading-snug text-slate-600">
                    <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      {h.texto}{' '}
                      <a href={h.fuente.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 whitespace-nowrap font-semibold text-emerald-700 underline-offset-2 hover:underline">
                        {h.fuente.nombre}<ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                      </a>
                    </span>
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
