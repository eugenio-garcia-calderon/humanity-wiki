import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import Icono from '../../ui/Icono';
import { useSitio } from '../../sitio/ContextoSitio';
import { temasDe, type Tema } from './temas';

/** El icono de un tema con su color; sin icono, un punto del color. */
function IconoTema({ t, tamano }: { t: Tema; tamano: number }) {
  return t.icono
    ? <Icono valor={t.icono} tamano={tamano} />
    : <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color || '#94a3b8' }} />;
}

/** El menú, tal cual se ve. En el editor los enlaces no navegan: se está escribiendo la página. */
export function VistaMenuTemas({ datos, enEditor = false }: { datos: Record<string, unknown>; enEditor?: boolean }) {
  const temas = temasDe(datos);
  const titulo = typeof datos.titulo === 'string' ? datos.titulo.trim() : '';
  const rejilla = datos.forma === 'rejilla';
  const [abierto, setAbierto] = useState<string | null>(null);
  const noNavegar = enEditor ? (e: React.MouseEvent) => e.preventDefault() : undefined;
  // Dentro de una web publicada, una página propia se abre por su dirección pública (la que hereda
  // si se ve o no de su página madre), no por la del editor.
  const sitio = useSitio();
  const destino = (enlace?: string) => {
    const pagina = enlace?.match(/^\/paginas\/(KW[A-Za-z0-9]+)$/)?.[1];
    return (pagina && sitio ? sitio.enlacePagina(pagina) : enlace) || undefined;
  };

  if (!temas.length) return <p className="text-sm text-slate-400">Este menú aún no tiene temas.</p>;

  if (rejilla) {
    return (
      <nav aria-label={titulo || 'Temas'}>
        {titulo && <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{titulo}</p>}
        <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 sm:gap-3 md:grid-cols-5">
          {temas.map(t => (
            <a key={t.id} href={destino(t.enlace)} onClick={noNavegar}
              className="group flex items-center gap-2.5 rounded-2xl border border-slate-100 p-3 transition-colors hover:border-slate-200 hover:bg-slate-50 sm:flex-col sm:text-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 group-hover:bg-white" style={{ color: t.color }}>
                <IconoTema t={t} tamano={20} />
              </span>
              <span className="line-clamp-2 text-xs font-bold leading-tight text-slate-700">{t.nombre}</span>
            </a>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label={titulo || 'Temas'} className="max-w-sm rounded-2xl border border-slate-100 bg-white p-2">
      {titulo && <p className="px-2 pb-1 pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{titulo}</p>}
      <ul>
        {temas.map(t => {
          const conHijos = !!t.hijos?.length;
          const desplegado = abierto === t.id;
          return (
            <li key={t.id}>
              <div className="flex items-center rounded-xl hover:bg-slate-50">
                <a href={destino(t.enlace)} onClick={noNavegar} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center" style={{ color: t.color }}><IconoTema t={t} tamano={18} /></span>
                  <span className="truncate text-[13px] font-black uppercase tracking-wide text-slate-800">{t.nombre}</span>
                </a>
                {conHijos ? (
                  <button type="button" onClick={() => setAbierto(desplegado ? null : t.id)} aria-expanded={desplegado} aria-label={`Subtemas de ${t.nombre}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:text-slate-700">
                    {desplegado ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                ) : <ChevronRight aria-hidden className="mr-2 h-4 w-4 shrink-0 text-slate-300" />}
              </div>
              {conHijos && desplegado && (
                <ul className="mb-1 ml-9 border-l border-slate-100 pl-2">
                  {t.hijos!.map(h => (
                    <li key={h.id}>
                      <a href={destino(h.enlace)} onClick={noNavegar}
                        className="block rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900">{h.nombre}</a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function Lectura({ datos }: PropsLectura) {
  return <VistaMenuTemas datos={datos} />;
}
