import { Handshake, Leaf, Scale, Sprout, type LucideIcon } from 'lucide-react';

// ============================================================================
// LOS PRINCIPIOS DEL LABORATORIO (2026-11-27, Eugenio)
// ============================================================================
// «Añade en la página web una sección de los principios y valores del laboratorio a la hora de innovar»:
// de abajo hacia arriba, en sintonía con la naturaleza, paz y cooperación, igualdad de oportunidades.
//
// The texts live in the root page's configuration, `sitio.principios` (migration 0245), not here: that is
// what the English and Portuguese replicas translate, and what Eugenio can edit without a deploy.
// Only the icons are in the code, by each principle's `icono`.

type Principio = { id: string; icono?: string; titulo: string; resumen?: string; puntos?: string[] };
export type ConfigPrincipios = { titulo?: string; texto?: string; lista?: Principio[] };

const ICONOS: Record<string, { Icono: LucideIcon; color: string }> = {
  escalas: { Icono: Sprout, color: 'bg-sky-50 text-sky-700 ring-sky-100' },
  naturaleza: { Icono: Leaf, color: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  paz: { Icono: Handshake, color: 'bg-amber-50 text-amber-700 ring-amber-100' },
  oportunidades: { Icono: Scale, color: 'bg-violet-50 text-violet-700 ring-violet-100' },
};

export default function PrincipiosSitio({ cfg }: { cfg?: ConfigPrincipios | null }) {
  const lista = (cfg?.lista || []).filter(p => p && p.titulo);
  if (!lista.length) return null;
  return (
    <section data-ancla="principios" aria-labelledby="principios-titulo" className="mt-14 scroll-mt-36 outline-none sm:mt-20 sm:scroll-mt-24">
      <div className="border-b border-slate-200 pb-4">
        <h2 id="principios-titulo" className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{cfg?.titulo || 'Nuestros principios'}</h2>
        {cfg?.texto && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-500">{cfg.texto}</p>}
      </div>
      <ol className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:mt-8 sm:grid-cols-2 xl:grid-cols-4">
        {lista.map((p, i) => {
          const { Icono, color } = ICONOS[p.icono || ''] || ICONOS.escalas;
          return (
            <li key={p.id || i} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ${color}`} aria-hidden="true">
                  <Icono className="h-5 w-5" />
                </span>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-4 text-lg font-black leading-snug text-slate-900">{p.titulo}</h3>
              {p.resumen && <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{p.resumen}</p>}
              {!!p.puntos?.length && (
                <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">
                  {p.puntos.map((x, k) => <li key={k} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-slate-300">{x}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
