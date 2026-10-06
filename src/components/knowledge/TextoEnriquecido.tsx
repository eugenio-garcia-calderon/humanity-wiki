import { lazy, Suspense, type ReactNode } from 'react';
import { AtSign, Calendar, FileText } from 'lucide-react';
import { claseDeEnlace, fechaRelativa } from '../../utils/menciones';
import { useSitio } from '../sitio/ContextoSitio';
import { cn } from '../../utils/cn';
// KaTeX no entra en el JS principal: se pide al pintar la primera fórmula.
const Formula = lazy(() => import('./Formula'));

// ============================================================================
// TEXTO CON NEGRITA, CURSIVA, CÓDIGO Y ENLACES (2026-10-01)
// ============================================================================
// Eugenio: «haz que los enlaces se puedan ver, y que al clicar se abran en el
// navegador del usuario —Chrome, Firefox, Safari—, no en el navegador propio
// de la aplicación».
//
// Antes había dos pintores: el editor entendía `[texto](url)` y la página
// publicada no entendía nada —enseñaba los corchetes tal cual— y ninguno de
// los dos convertía en enlace una dirección pegada a secas. Ahora hay uno, y
// los dos lo usan.
//
// Un enlace EXTERNO abre una pestaña nueva del navegador del usuario
// (`target="_blank"`); `data-externo` le dice al gestor de ventanas que no lo
// meta en el navegador interno. Uno de la propia plataforma (`/paginas/…`,
// `#b-…`) navega en la misma pestaña, como cualquier enlace interno.

// `$fórmula$` (2026-10-06, #19): sin espacio tras el primer $ ni antes del
// último, y el último no va seguido de una cifra, para que «cuesta $5 y $6» no
// se lea como una fórmula (son las reglas de Pandoc).
const RE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|(?<![\\$\w])\$(?![\s$])[^$\n]+?(?<![\s\\])\$(?![\d$])|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»])/g;

const CLASE_ENLACE = 'text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:decoration-emerald-600 break-words';

export function Enlace({ href, children }: { href: string; children: ReactNode }) {
  const externo = /^https?:\/\//i.test(href) && !href.startsWith(typeof location !== 'undefined' ? location.origin : '\u0000');
  return externo
    ? <a href={href} target="_blank" rel="noopener noreferrer" data-externo className={CLASE_ENLACE}
        onClick={e => e.stopPropagation()}>{children}</a>
    : <a href={href} className={CLASE_ENLACE}>{children}</a>;
}

const CHIP = 'inline-flex items-center gap-1 px-1.5 rounded-md bg-slate-100 text-slate-800 font-medium align-baseline hover:bg-slate-200 transition-colors no-underline';

/** Una mención (persona, página o fecha) como etiqueta pequeña (#6). Dentro de
 *  un sitio publicado las direcciones se arman con las del sitio. */
function Mencion({ clase, id, texto }: { clase: 'persona' | 'pagina' | 'fecha'; id: string; texto: string }) {
  const sitio = useSitio();
  if (clase === 'fecha') {
    return <span className={CHIP.replace('hover:bg-slate-200 ', '')} title={id}><Calendar className="w-3 h-3 text-slate-500" />{fechaRelativa(id)}</span>;
  }
  if (clase === 'persona') {
    // Un dominio propio no tiene `/personas`: se va a la plataforma.
    const href = sitio ? `https://humanity.wiki/personas/${id}` : `/personas/${id}`;
    return (
      <a href={href} {...(sitio ? { target: '_blank', rel: 'noopener noreferrer', 'data-externo': true } : {})}
        className={CHIP} onClick={e => e.stopPropagation()}>
        <AtSign className="w-3 h-3 text-slate-500" />{texto.replace(/^@/, '')}
      </a>
    );
  }
  return (
    <a href={sitio ? sitio.enlacePagina(id) : `/paginas/${id}`} className={cn(CHIP, 'underline decoration-slate-300 underline-offset-2')} onClick={e => e.stopPropagation()}>
      <FileText className="w-3 h-3 text-slate-500" />{texto}
    </a>
  );
}

export default function TextoEnriquecido({ texto }: { texto: string }) {
  const out: ReactNode[] = [];
  let ultimo = 0; let m: RegExpExecArray | null; let k = 0;
  RE.lastIndex = 0;
  while ((m = RE.exec(texto))) {
    if (m.index > ultimo) out.push(texto.slice(ultimo, m.index));
    const s = m[0];
    if (s.startsWith('**')) out.push(<strong key={k++}>{s.slice(2, -2)}</strong>);
    else if (s.startsWith('`')) out.push(<code key={k++} className="px-1 py-0.5 bg-slate-100 rounded text-[0.9em] font-mono">{s.slice(1, -1)}</code>);
    else if (s.startsWith('$')) {
      const tex = s.slice(1, -1);
      out.push(<Suspense key={k++} fallback={<code className="font-mono text-[0.9em] text-slate-400">{tex}</code>}><Formula tex={tex} /></Suspense>);
    }
    else if (s.startsWith('*')) out.push(<em key={k++}>{s.slice(1, -1)}</em>);
    else if (s.startsWith('[')) {
      const l = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const mencion = l ? claseDeEnlace(l[2]) : null;
      out.push(!l ? s : mencion ? <Mencion key={k++} clase={mencion.clase} id={mencion.id} texto={l[1]} /> : <Enlace key={k++} href={l[2]}>{l[1]}</Enlace>);
    } else {
      // Una dirección pegada a secas: se enseña sin `https://` para que se lea.
      out.push(<Enlace key={k++} href={s}>{s.replace(/^https?:\/\/(www\.)?/i, '')}</Enlace>);
    }
    ultimo = m.index + s.length;
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return <>{out}</>;
}
