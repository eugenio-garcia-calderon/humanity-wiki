import { ExternalLink, Globe } from 'lucide-react';
import type { Bloque } from '../../utils/bloques';
import { embedDe, SANDBOX_EMBED } from '../../utils/embeds';

// ============================================================================
// EL CONTENIDO INCRUSTADO DE UN TERCERO (2026-10-06, carril editorB, #20)
// ============================================================================
// Figma, Maps, Drive, Spotify, Loom, CodePen, X, Miro… Lo pintan el editor y la
// página publicada, así que se ven y se protegen igual en los dos.
//
// El bloque guarda la dirección ORIGINAL que se pegó; el `src` del iframe sale
// siempre de `embedDe`, que es la lista blanca (ver `utils/embeds.ts`). Si lo
// guardado no pasa la lista —datos retocados a mano, un servicio que se quita—
// no se pinta ningún iframe: queda un enlace, que es lo que es.

export default function BloqueEmbed({ b, onAlto }: { b: Bloque; onAlto?: (alto: number) => void }) {
  const url = b.url || '';
  const e = embedDe(url);
  if (!e) {
    return (
      <a href={/^https?:\/\//i.test(url) ? url : undefined} target="_blank" rel="noopener noreferrer" data-externo
        className="flex items-center gap-2 px-3 min-h-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50">
        <Globe className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="truncate">{url || 'Contenido incrustado'}</span>
      </a>
    );
  }
  const alto = b.alto || e.alto;
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white" data-embed={e.proveedor}>
      <div style={e.relacion && !b.alto ? { aspectRatio: String(e.relacion) } : { height: alto }} className="w-full">
        <iframe src={e.src} title={`${e.proveedor}: contenido incrustado`} loading="lazy"
          sandbox={SANDBOX_EMBED} allow={e.permisos} allowFullScreen={!!e.permisos?.includes('fullscreen')}
          referrerPolicy="strict-origin-when-cross-origin"
          className="block w-full h-full border-0 bg-white" />
      </div>
      <div className="flex items-center gap-2 px-3 h-9 border-t border-slate-100 text-xs text-slate-500">
        <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate flex-1 font-bold text-slate-600">{e.proveedor}</span>
        {onAlto && [['Bajo', Math.round(e.alto * 0.7)], ['Medio', e.alto], ['Alto', Math.round(e.alto * 1.5)]].map(([l, v]) => (
          <button key={l as string} type="button" onClick={ev => { ev.stopPropagation(); onAlto(v as number); }}
            className={alto === v ? 'font-bold text-slate-800' : 'text-slate-400 hover:text-slate-700'}>{l}</button>
        ))}
        <a href={url} target="_blank" rel="noopener noreferrer" data-externo onClick={ev => ev.stopPropagation()}
          className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800">
          Abrir <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
