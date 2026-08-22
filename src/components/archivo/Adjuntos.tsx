// ============================================================================
// LOS ARCHIVOS DE UNA COSA (2026-08-21) — el lado visible del archivo.
// ============================================================================
// El mismo bloque sirve para un proyecto, una tarea o una página: lo único que
// cambia es de qué cuelgan. Se hizo así porque «adjuntar un fichero» es la
// misma operación en los tres sitios, y tener tres versiones sería tener tres
// sitios donde arreglar el mismo fallo.
//
// SUBIR Y COLGAR SON DOS PASOS, y se ven como uno: primero los bytes van a
// /api/uploads (que ya existía y sabe de tipos y tamaños) y después se anota de
// qué cuelgan. Separarlos es lo que permite que el chat y el editor sigan
// subiendo como siempre sin saber nada de contenedores.
import { useCallback, useEffect, useRef, useState } from 'react';
import { subirArchivo } from '../../utils/subir';
import {
  Paperclip, Loader2, Trash2, FileText, Image as ImageIcon, Video, Music, File as FileIcon, Download,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface Adjunto {
  id: string;
  url: string;
  nombre: string;
  mime: string;
  bytes: number | string;
  clase: 'imagen' | 'video' | 'audio' | 'pdf' | 'archivo';
  subido_por_nombre?: string | null;
  created_at?: string;
}

const ICONO: Record<Adjunto['clase'], any> = {
  imagen: ImageIcon, video: Video, audio: Music, pdf: FileText, archivo: FileIcon,
};

/** 21 → «21 B», 1.500.000 → «1,4 MB». Un número de bytes crudo no le dice nada
 *  a nadie, y es justo lo que se mira para saber si algo se puede descargar. */
const tamano = (b: number | string) => {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
};

export default function Adjuntos({ contenedor, id, puedeEditar, titulo = 'Archivos' }: {
  contenedor: 'proyecto_id' | 'tarea_id' | 'pagina_id';
  id: string;
  puedeEditar: boolean;
  titulo?: string;
}) {
  const [lista, setLista] = useState<Adjunto[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);
  const fichero = useRef<HTMLInputElement>(null);

  const cargar = useCallback(() => {
    fetch(`/api/archivo?${contenedor}=${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setLista(Array.isArray(d) ? d : []))
      .catch(() => setLista([]));
  }, [contenedor, id]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Sube los bytes y luego los cuelga de aquí. Si el segundo paso falla, se
   *  dice: un fichero subido que no queda colgado de nada es exactamente el
   *  problema que este archivo viene a resolver. */
  const subir = async (f?: File | null) => {
    if (!f) return;
    setSubiendo(true);
    setError(null);
    try {
      const u = await subirArchivo(f);
      if (u.error) throw new Error(u.error);

      const r = await fetch('/api/archivo', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [contenedor]: id,
          url: u.url, nombre: f.name || 'archivo',
          mime: u.type, bytes: u.bytes, clase: u.clase,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Se ha subido, pero no he podido colgarlo aquí.');
      setLista(l => [j, ...(l || [])]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async (a: Adjunto) => {
    setLista(l => (l || []).filter(x => x.id !== a.id));
    try {
      const r = await fetch(`/api/archivo/${a.id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error((await r.json())?.error || 'No se ha podido quitar.');
    } catch (e: any) {
      setError(e.message);
      cargar();
    }
  };

  return (
    <section
      // ARRASTRAR UN FICHERO ENCIMA lo sube. Es como se mueve un fichero en
      // cualquier sitio, y buscar el botón es un paso que sobra.
      onDragOver={e => { if (puedeEditar && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setEncima(true); } }}
      onDragLeave={() => setEncima(false)}
      onDrop={e => {
        if (!puedeEditar) return;
        e.preventDefault();
        setEncima(false);
        subir(e.dataTransfer.files?.[0]);
      }}
      className={cn('rounded-2xl border bg-white p-4 transition-colors',
        encima ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200')}
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 inline-flex items-center gap-1.5">
          <Paperclip className="w-3 h-3" /> {titulo}
          {!!lista?.length && <span className="text-slate-300">{lista.length}</span>}
        </h3>
        {puedeEditar && (
          <>
            <input ref={fichero} type="file" className="hidden"
              onChange={e => { subir(e.target.files?.[0]); e.target.value = ''; }} />
            <button
              onClick={() => fichero.current?.click()}
              disabled={subiendo}
              className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 transition-colors"
            >
              {subiendo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
              {subiendo ? 'Subiendo…' : 'Adjuntar'}
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mb-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">{error}</p>
      )}

      {lista === null ? (
        <p className="text-[11px] text-slate-300 italic">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">
          {puedeEditar ? 'Nada todavía. Arrastra un archivo aquí o pulsa Adjuntar.' : 'Sin archivos.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {lista.map(a => {
            const Icono = ICONO[a.clase] || FileIcon;
            return (
              <li key={a.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                {/* Las imágenes se ven, que es lo que uno quiere de una imagen. */}
                {a.clase === 'imagen'
                  ? <img src={a.url} alt="" className="w-8 h-8 rounded object-cover shrink-0" loading="lazy" />
                  : <span className="w-8 h-8 rounded bg-slate-100 grid place-items-center shrink-0">
                      <Icono className="w-4 h-4 text-slate-500" />
                    </span>}
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener"
                  className="min-w-0 flex-1"
                  title={a.nombre}
                >
                  <span className="block text-xs font-bold text-slate-800 truncate hover:text-emerald-700">{a.nombre}</span>
                  <span className="block text-[10px] text-slate-400">
                    {tamano(a.bytes)}
                    {a.subido_por_nombre ? ` · ${a.subido_por_nombre}` : ''}
                  </span>
                </a>
                <a href={a.url} download={a.nombre} title="Descargar"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-all">
                  <Download className="w-3.5 h-3.5" />
                </a>
                {puedeEditar && (
                  <button onClick={() => quitar(a)} title="Quitar de aquí"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
