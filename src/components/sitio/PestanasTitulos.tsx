import { useEffect, useMemo, useState } from 'react';
import BloquesLectura from '../knowledge/BloquesLectura';
import { cn } from '../../utils/cn';

// ============================================================================
// LOS TÍTULOS DE LA PÁGINA COMO PESTAÑAS (2026-10-26, Eugenio)
// ============================================================================
// «La página de donar con secciones en pestañas, una de ellas Transparencia,
// donde yo pueda añadir informes.» Con `config.pestanasTitulos`, cada título 2
// abre una pestaña con lo que tiene debajo hasta el siguiente; lo de antes del
// primero va encima de las pestañas. En el editor siguen siendo títulos y
// bloques normales: añadir un informe es escribir debajo de «Transparencia».
// La pestaña abierta va en la dirección (`#transparencia`) para poder enlazarla.

const limpio = (t: unknown) => String(t || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const ancla = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function partirPorTitulos(bloques: any[]) {
  const antes: any[] = [];
  const grupos: { titulo: string; id: string; bloques: any[] }[] = [];
  for (const b of bloques) {
    if (b?.tipo === 'titulo2' && limpio(b.texto)) {
      const titulo = limpio(b.texto);
      grupos.push({ titulo, id: ancla(titulo) || String(b.id), bloques: [] });
    } else if (grupos.length) grupos[grupos.length - 1].bloques.push(b);
    else antes.push(b);
  }
  return { antes, grupos };
}

export default function PestanasTitulos({ bloques, paginaId }: { bloques: any[]; paginaId?: string }) {
  const { antes, grupos } = useMemo(() => partirPorTitulos(bloques), [bloques]);
  const desdeHash = () => { try { return decodeURIComponent(window.location.hash.slice(1)); } catch { return ''; } };
  const [abierta, setAbierta] = useState<string>(() => (grupos.some(g => g.id === desdeHash()) ? desdeHash() : grupos[0]?.id || ''));
  useEffect(() => {
    const oir = () => { const h = desdeHash(); if (grupos.some(g => g.id === h)) setAbierta(h); };
    window.addEventListener('hashchange', oir);
    return () => window.removeEventListener('hashchange', oir);
  }, [grupos]);
  if (!grupos.length) return <BloquesLectura bloques={bloques} comentable={paginaId} paginaId={paginaId} />;
  const g = grupos.find(x => x.id === abierta) || grupos[0];
  const abrir = (id: string) => {
    setAbierta(id);
    try { history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}#${id}`); } catch { /* sin historial */ }
  };
  return (
    <div data-pestanas-titulos>
      {antes.length > 0 && <BloquesLectura bloques={antes} comentable={paginaId} paginaId={paginaId} />}
      <div role="tablist" aria-label="Secciones" className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {grupos.map(x => (
          <button key={x.id} role="tab" type="button" aria-selected={x.id === g.id} onClick={() => abrir(x.id)}
            className={cn('-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[17px] font-semibold transition-colors',
              x.id === g.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {x.titulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={g.titulo} className="pt-5">
        <BloquesLectura key={g.id} bloques={g.bloques} comentable={paginaId} paginaId={paginaId} />
      </div>
    </div>
  );
}
