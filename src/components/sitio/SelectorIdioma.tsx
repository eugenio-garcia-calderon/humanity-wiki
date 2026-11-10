import { useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';

// EL SELECTOR DE IDIOMA (2026-11-10, Eugenio: «arriba a la derecha del todo, para transitar del
// español al inglés»). Cada idioma es su propio dominio (`traducciones.ts`) y cada enlace lleva a la
// misma página en ese idioma. Son enlaces de verdad: se eligen, nunca se redirige por el idioma.
type Datos = { actual: string; idiomas: Array<{ id: string; host: string; etiqueta: string; nombre: string }>; rutas: Record<string, Record<string, string>> };

function Enlaces({ datos }: { datos: Datos }) {
  const { pathname } = useLocation();
  const desdeActual = Object.fromEntries(Object.entries(datos.rutas[datos.actual] || {}).map(([es, otro]) => [otro, es]));
  const tramos = pathname.split('/').filter(Boolean).map(t => desdeActual[t] || t);
  return (
    <nav aria-label="Idioma" className="flex shrink-0 items-center gap-0.5 text-xs font-bold">
      {datos.idiomas.map(i => {
        const actual = i.id === datos.actual;
        const camino = tramos.map(t => datos.rutas[i.id]?.[t] || t).join('/');
        return (
          <a key={i.id} href={`https://${i.host}/${camino}`} hrefLang={i.id} lang={i.id} title={i.nombre} aria-label={i.nombre} aria-current={actual ? 'true' : undefined}
            className={cn('grid h-11 min-w-9 place-items-center rounded-lg px-1.5 transition-colors', actual ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900')}>
            {i.etiqueta}
          </a>
        );
      })}
    </nav>
  );
}

export default function SelectorIdioma() {
  const datos: Datos | undefined = typeof window !== 'undefined' ? (window as any).__IDIOMA_SITIO__ : undefined;
  return datos && datos.idiomas.length > 1 ? <Enlaces datos={datos} /> : null;
}
