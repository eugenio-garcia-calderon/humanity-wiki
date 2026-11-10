import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import TarjetaPortada, { CLASE_TARJETA_PORTADA, type EstadoTarjeta } from '../tablas/TarjetaPortada';
import { iconoCategoria } from './iconoCategoria';

// ============================================================================
// PROYECTOS QUE NOS INSPIRAN (2026-11-10, Eugenio: «una sección al final, antes del footer, con
// una base de datos de proyectos de otras personas y organizaciones; un grid de una sola línea
// con un slider»). Es una tabla del sitio (`sitio.inspiran`): se añaden y se editan como cualquier
// fila. La misma tarjeta que los proyectos; lleva fuera, a la web de cada uno. Con portada en su
// página sale la foto; sin ella, el color de su ámbito y su icono.

type Celda = { valor?: unknown };
type Fila = { id: string; oculta?: boolean; pagina?: { titulo?: string; imagen?: string | null; descripcion?: string | null; encuadre?: { x?: number; y?: number } | null } | null; celdas: Record<string, Celda> };
type Columna = { id: string; nombre: string; tipo: string; opciones?: EstadoTarjeta[] };
export type TablaInspiran = { columnas: Columna[]; filas: Fila[] };

export default function InspiranSitio({ tabla }: { tabla: TablaInspiran }) {
  const carril = useRef<HTMLUListElement>(null);
  const [lados, setLados] = useState({ antes: false, despues: false });
  const medir = () => {
    const c = carril.current;
    if (c) setLados({ antes: c.scrollLeft > 4, despues: c.scrollLeft + c.clientWidth < c.scrollWidth - 4 });
  };
  useEffect(() => {
    medir();
    const o = new ResizeObserver(medir);
    if (carril.current) o.observe(carril.current);
    return () => o.disconnect();
  }, [tabla]);
  const mover = (lado: 1 | -1) => {
    const c = carril.current;
    if (!c) return;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    c.scrollBy({ left: lado * ((c.firstElementChild as HTMLElement | null)?.offsetWidth || 320), behavior: quieto ? 'auto' : 'smooth' });
  };

  const colUrl = tabla.columnas.find(c => c.tipo === 'url');
  const colAmbito = tabla.columnas.find(c => c.tipo === 'seleccion');
  const filas = tabla.filas.filter(f => !f.oculta && f.pagina?.titulo);
  if (!filas.length) return null;
  const flecha = 'grid h-11 w-11 place-items-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:cursor-default disabled:opacity-30 disabled:hover:border-slate-300';

  return (
    <section aria-labelledby="inspiran-titulo" className="mt-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="inspiran-titulo" className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Proyectos que nos inspiran</h2>
        {(lados.antes || lados.despues) && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => mover(-1)} disabled={!lados.antes} aria-label="Anteriores" className={flecha}><ChevronLeft aria-hidden className="h-5 w-5" /></button>
            <button type="button" onClick={() => mover(1)} disabled={!lados.despues} aria-label="Siguientes" className={flecha}><ChevronRight aria-hidden className="h-5 w-5" /></button>
          </div>
        )}
      </div>
      <ul ref={carril} onScroll={medir} tabIndex={0} aria-label="Proyectos que nos inspiran"
        className="flex list-none snap-x snap-mandatory gap-5 overflow-x-auto p-0 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filas.map((f, i) => {
          const nombre = String(f.pagina?.titulo || '');
          const enlace = colUrl ? String(f.celdas[colUrl.id]?.valor || '') : '';
          const ambito = colAmbito?.opciones?.find(o => o.id === String(f.celdas[colAmbito.id]?.valor || '')) || null;
          const tarjeta = (
            <TarjetaPortada nombre={nombre} imagen={f.pagina?.imagen} encuadre={f.pagina?.encuadre} descripcion={f.pagina?.descripcion} Titulo="h3" prioridad={9 + i}
              pildora={ambito} iconoPildora={ambito ? iconoCategoria(ambito.label) : undefined} nombrePildora="Ámbito"
              fondo={ambito && (
                <div aria-hidden data-fondo-oscuro="" className="grid h-full w-full place-items-center pb-16" style={{ background: `linear-gradient(135deg, ${ambito.color || '#334155'}, #020617)` }}>
                  {iconoCategoria(ambito.label, 'h-24 w-24 text-white/30')}
                </div>
              )} />
          );
          return (
            <li key={f.id} className={cn('w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]')}>
              {/^https?:\/\//.test(enlace)
                ? <a href={enlace} target="_blank" rel="noopener noreferrer" className={CLASE_TARJETA_PORTADA}>{tarjeta}</a>
                : <div className={CLASE_TARJETA_PORTADA}>{tarjeta}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
