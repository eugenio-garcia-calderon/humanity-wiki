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
import { enCampoDeTexto } from '../../utils/pegado';
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
  const subir = async (...archivos: Array<File | null | undefined>) => {
    const fs = archivos.filter(Boolean) as File[];
    if (!fs.length) return;
    setSubiendo(true);
    setError(null);
    try {
      for (const f of fs) {
        const u = await subirArchivo(f);
        if (u.error) throw new Error(u.error);

        const r = await fetch('/api/archivo', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [contenedor]: id,
            // Una captura pegada llega SIN NOMBRE («image.png» o vacío). Se le
            // pone uno con la fecha: en una lista de archivos, tres cosas
            // llamadas «image.png» no se distinguen entre sí, y el nombre es lo
            // único que se ve.
            url: u.url,
            nombre: f.name && f.name !== 'image.png'
              ? f.name
              : `Captura ${new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${(f.type.split('/')[1] ? '.' + f.type.split('/')[1] : '')}`,
            mime: u.type, bytes: u.bytes, clase: u.clase,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'Se ha subido, pero no he podido colgarlo aquí.');
        setLista(l => [j, ...(l || [])]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  };

  /*
   * ── PEGAR (2026-08-26) ────────────────────────────────────────────────────
   * Eugenio: «en proyectos, en la parte de archivos, permitir pegar imágenes».
   *
   * Una captura de pantalla no es un fichero que puedas arrastrar: está en el
   * portapapeles y en ningún sitio más. Sin esto había que guardarla al disco
   * primero, buscarla y arrastrarla — tres pasos para algo que acaba de
   * ocurrir en la pantalla.
   *
   * ── NUNCA SE LE ROBA EL ⌘V A UN CAMPO DE TEXTO ───────────────────────────
   * Ni a otro bloque de archivos. En un proyecto puede haber varios a la vez
   * —el del proyecto y el de cada tarea abierta— y un `paste` en la ventana los
   * despertaría a todos: la misma captura subida tres veces, en tres sitios,
   * sin que nadie lo haya pedido.
   *
   * Por eso hace falta que este bloque esté **señalado**: el ratón encima o el
   * foco dentro. Es lo que convierte «pegar» en «pegar AQUÍ», que es la única
   * forma de que la respuesta no sea una lotería.
   */
  const [senalado, setSenalado] = useState(false);

  useEffect(() => {
    if (!puedeEditar || !senalado) return;
    const alPegar = (e: ClipboardEvent) => {
      if (enCampoDeTexto(e.target)) return;
      const fs = Array.from(e.clipboardData?.files || []);
      if (!fs.length) {
        // Se dice, en vez de no hacer nada. Copiar una imagen desde una web
        // pone en el portapapeles el HTML del trozo, no el archivo — y un
        // pegado que no responde se lee como que esto no funciona.
        if ((e.clipboardData?.getData('text/plain') || '').trim()) {
          setError('Eso es texto, no un archivo. Copia la imagen (o arrástrala) y vuelve a pegar.');
        }
        return;
      }
      e.preventDefault();
      subir(...fs);
    };
    window.addEventListener('paste', alPegar);
    return () => window.removeEventListener('paste', alPegar);
  }, [puedeEditar, senalado, contenedor, id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Todos los que se suelten, no sólo el primero: arrastrar cinco fotos y
        // que suba una es de las cosas que no se notan hasta que faltan cuatro.
        subir(...Array.from(e.dataTransfer.files || []));
      }}
      onMouseEnter={() => setSenalado(true)}
      onMouseLeave={() => setSenalado(false)}
      onFocus={() => setSenalado(true)}
      onBlur={() => setSenalado(false)}
      // Enfocable para que en un teclado —y en un lector de pantalla— también
      // se pueda señalar dónde se pega, sin ratón.
      tabIndex={puedeEditar ? 0 : undefined}
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
            {/* `multiple`, ahora que subir acepta varios: elegir cinco en el
                diálogo y que suba una es el mismo fallo que arrastrar cinco. */}
            <input ref={fichero} type="file" multiple className="hidden"
              onChange={e => { subir(...Array.from(e.target.files || [])); e.target.value = ''; }} />
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
          {puedeEditar ? 'Nada todavía. Arrastra un archivo aquí, pega una imagen con ⌘V o pulsa Adjuntar.' : 'Sin archivos.'}
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
