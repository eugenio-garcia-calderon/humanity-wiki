import type { ReactNode } from 'react';

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

const RE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»])/g;

const CLASE_ENLACE = 'text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:decoration-emerald-600 break-words';

export function Enlace({ href, children }: { href: string; children: ReactNode }) {
  const externo = /^https?:\/\//i.test(href) && !href.startsWith(typeof location !== 'undefined' ? location.origin : '\u0000');
  return externo
    ? <a href={href} target="_blank" rel="noopener noreferrer" data-externo className={CLASE_ENLACE}
        onClick={e => e.stopPropagation()}>{children}</a>
    : <a href={href} className={CLASE_ENLACE}>{children}</a>;
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
    else if (s.startsWith('*')) out.push(<em key={k++}>{s.slice(1, -1)}</em>);
    else if (s.startsWith('[')) {
      const l = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      out.push(l ? <Enlace key={k++} href={l[2]}>{l[1]}</Enlace> : s);
    } else {
      // Una dirección pegada a secas: se enseña sin `https://` para que se lea.
      out.push(<Enlace key={k++} href={s}>{s.replace(/^https?:\/\/(www\.)?/i, '')}</Enlace>);
    }
    ultimo = m.index + s.length;
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return <>{out}</>;
}
