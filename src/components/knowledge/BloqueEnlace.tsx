import { useState } from 'react';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';
import type { Bloque } from '../../utils/bloques';

// ============================================================================
// UN ENLACE COMO TARJETA, O LA WEB DENTRO DE LA PÁGINA (2026-10-02)
// ============================================================================
// Eugenio: «cuando se pegue un enlace, que te permita escoger si quieres que
// se embeba esa web, o una vista con imagen, título y descripción, o que se
// pegue el enlace de forma normal. Como hace Notion».
//
// `TarjetaMarcador` es el «bookmark» de Notion: título, descripción, el icono
// y la dirección del sitio, y su imagen a la derecha. `WebInsertada` es la
// web entera en un recuadro. Los dos los pintan el editor y la página
// publicada, así que se ven igual en los dos sitios.
//
// Lo que se leyó de la web (título, imagen…) se guardó al pegarla: la tarjeta
// no vuelve a preguntar a esa web en cada visita.

const sinProtocolo = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

export function TarjetaMarcador({ b, cargando }: { b: Bloque; cargando?: boolean }) {
  const [sinImagen, setSinImagen] = useState(false);
  const [sinIcono, setSinIcono] = useState(false);
  const url = b.url || '';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" data-externo onClick={e => e.stopPropagation()}
      className="group/marcador flex items-stretch w-full min-h-[6.5rem] rounded-xl border border-slate-200 bg-white overflow-hidden text-left hover:bg-slate-50 transition-colors">
      <span className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-4 py-3">
        <span className="text-sm font-semibold text-slate-800 truncate">
          {cargando && !b.enlaceTitulo
            ? <span className="inline-flex items-center gap-1.5 text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Leyendo la página…</span>
            : (b.enlaceTitulo || sinProtocolo(url))}
        </span>
        {b.enlaceDescripcion && <span className="text-xs text-slate-500 leading-snug line-clamp-2">{b.enlaceDescripcion}</span>}
        <span className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 min-w-0">
          {b.enlaceIcono && !sinIcono
            ? <img src={b.enlaceIcono} alt="" className="w-3.5 h-3.5 shrink-0 rounded-sm" onError={() => setSinIcono(true)} />
            : <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
          <span className="truncate">{sinProtocolo(url)}</span>
        </span>
      </span>
      {b.enlaceImagen && !sinImagen && (
        // La imagen NO marca el alto: lo marca el texto, y ella se recorta a
        // ese hueco. Si no, una foto alta estiraba la tarjeta.
        <span className="relative hidden min-[420px]:block w-[34%] max-w-[15rem] shrink-0 bg-slate-100">
          <img src={b.enlaceImagen} alt="" loading="lazy" onError={() => setSinImagen(true)}
            className="absolute inset-0 w-full h-full object-cover" />
        </span>
      )}
    </a>
  );
}

export const ALTOS_WEB = [{ v: 320, l: 'Bajo' }, { v: 480, l: 'Medio' }, { v: 720, l: 'Alto' }];

export function WebInsertada({ b, onAlto }: { b: Bloque; onAlto?: (alto: number) => void }) {
  const url = b.url || '';
  const alto = b.alto || 480;
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <iframe src={url} title={b.enlaceTitulo || sinProtocolo(url)} loading="lazy"
        // Sin acceso a la página que la contiene: la web de dentro no puede
        // tocar la de fuera. Formularios y ventanas nuevas sí, para que se use.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
        className="block w-full border-0 bg-white" style={{ height: alto }} />
      <div className="flex items-center gap-2 px-3 h-9 border-t border-slate-100 text-xs text-slate-500">
        <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate flex-1">{b.enlaceTitulo || sinProtocolo(url)}</span>
        {onAlto && ALTOS_WEB.map(a => (
          <button key={a.v} type="button" onClick={e => { e.stopPropagation(); onAlto(a.v); }}
            className={alto === a.v ? 'font-bold text-slate-800' : 'text-slate-400 hover:text-slate-700'}>{a.l}</button>
        ))}
        <a href={url} target="_blank" rel="noopener noreferrer" data-externo onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800">
          Abrir <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

/** Lo que el servidor sabe de una dirección, ya con los nombres del bloque. */
export async function leerEnlace(url: string): Promise<{ campos: Partial<Bloque>; insertable: boolean } | null> {
  try {
    const r = await fetch(`/api/enlaces/previa?url=${encodeURIComponent(url)}`, { credentials: 'include' });
    if (!r.ok) return null;
    const j = await r.json();
    return {
      insertable: !!j.insertable,
      campos: {
        enlaceTitulo: j.titulo || undefined, enlaceDescripcion: j.descripcion || undefined,
        enlaceImagen: j.imagen || undefined, enlaceSitio: j.sitio || undefined, enlaceIcono: j.icono || undefined,
      },
    };
  } catch { return null; }
}
