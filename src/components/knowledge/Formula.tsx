import { useEffect, useState } from 'react';

// ============================================================================
// ECUACIONES LaTeX CON KaTeX (2026-10-06, carril editorB, #19)
// ============================================================================
// KaTeX pesa unos 270 KB sin comprimir más sus fuentes: no es algo que deba
// llevar el JS principal quien nunca escribe una fórmula. Se pide con
// `import()` la primera vez que hay una en pantalla, y se guarda la promesa:
// diez fórmulas, una descarga. Mientras llega se ve el TeX en crudo (que ya
// dice lo que es), y si la fórmula no se entiende, se enseña el error de
// KaTeX en rojo y el TeX, en vez de romper la página.
//
// Lo usan el editor, la lectura pública y el texto en línea (`$…$`), así que
// un cambio de aspecto o de seguridad es de un solo sitio.

let katex: Promise<typeof import('katex').default> | null = null;
const cargarKatex = () => (katex ||= Promise.all([
  import('katex'),
  import('katex/dist/katex.min.css'),
]).then(([m]) => m.default));

/** El HTML de KaTeX para un TeX. `trust: false` (por defecto) impide `\href`
 *  y `\includegraphics`: una fórmula es matemática, no un enlace. */
function pintar(k: typeof import('katex').default, tex: string, bloque: boolean): { html: string; error: string | null } {
  try {
    return { html: k.renderToString(tex, { displayMode: bloque, throwOnError: true, strict: 'ignore', trust: false, maxExpand: 1000, output: 'htmlAndMathml' }), error: null };
  } catch (e: any) {
    return { html: '', error: String(e?.message || e).replace(/^KaTeX parse error:\s*/, '').slice(0, 160) };
  }
}

export default function Formula({ tex, bloque = false, className = '' }: { tex: string; bloque?: boolean; className?: string }) {
  const [res, setRes] = useState<{ html: string; error: string | null } | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!tex.trim()) { setRes({ html: '', error: null }); return; }
    cargarKatex().then(k => { if (vivo) setRes(pintar(k, tex, bloque)); }).catch(() => { if (vivo) setRes({ html: '', error: 'No se pudo cargar el motor de fórmulas.' }); });
    return () => { vivo = false; };
  }, [tex, bloque]);

  if (!res) return <code className={`font-mono text-[0.9em] text-slate-400 ${className}`}>{tex}</code>;
  if (res.error) {
    return (
      <span className={`inline-flex flex-col ${className}`} title={res.error}>
        <code className="font-mono text-[0.9em] text-rose-600">{tex}</code>
        {bloque && <span className="text-xs text-rose-500">{res.error}</span>}
      </span>
    );
  }
  if (!res.html) return <span className={`text-slate-300 ${className}`}>{bloque ? 'Escribe una ecuación…' : ''}</span>;
  return <span className={className} dangerouslySetInnerHTML={{ __html: res.html }} />;
}
