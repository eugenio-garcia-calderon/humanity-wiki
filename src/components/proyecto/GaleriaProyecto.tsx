import { useEffect, useState } from 'react';
import { ImagePlus, X, Pencil, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { elegirYSubirImagenes, subirImagenes } from '../../utils/elegirImagen';
import { enCampoDeTexto } from '../../utils/pegado';

// ============================================================================
// LA GALERÍA DE UN PROYECTO (2026-08-26)
// ============================================================================
// Eugenio: «permite añadir una galería de imágenes general al proyecto, justo
// debajo del título. Con descripción de cada imagen opcional».
//
// ── UNA TIRA, NO UNA REJILLA ───────────────────────────────────────────────
// Va justo debajo del título, y ahí lo que hay debajo —las ramas, las personas,
// el tablero— es el proyecto en sí. Una rejilla de doce fotos empuja todo eso
// fuera de la pantalla y convierte la página del proyecto en un álbum. Una tira
// que se desplaza ocupa una altura fija sea cual sea el número de fotos, y
// dice «hay más» sin quitarle el sitio a nada.
//
// ── EL PIE DE FOTO ES OPCIONAL, Y SE NOTA ──────────────────────────────────
// Sin descripción no se pinta ninguna línea vacía debajo: un hueco reservado
// «por si acaso» descuadra la tira entera para que una de doce fotos tenga
// texto. La descripción completa se lee al abrir la imagen.

type Imagen = { id: string; url: string; descripcion: string | null; orden: number };

export default function GaleriaProyecto({ proyectoId }: { proyectoId: string }) {
  const [imagenes, setImagenes] = useState<Imagen[] | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [senalada, setSenalada] = useState(false);

  const cargar = () =>
    fetch(`/api/proyectos/${proyectoId}/galeria`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { setImagenes(j.imagenes ?? []); setPuedeEditar(!!j.puedeEditar); })
      .catch(() => setImagenes([]));

  useEffect(() => { cargar(); }, [proyectoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const colgar = async (urls: string[]) => {
    for (const url of urls) {
      const r = await fetch(`/api/proyectos/${proyectoId}/galeria`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'No he podido añadirla.');
      setImagenes(l => [...(l || []), j]);
    }
  };

  const anadir = async () => {
    if (subiendo) return;
    setFallo(null);
    const fs = await elegirYSubirImagenes(true);
    if (fs.error) { setFallo(fs.error); return; }
    if (!fs.urls.length) return;
    setSubiendo(true);
    try { await colgar(fs.urls); }
    catch (e: any) { setFallo(e.message); }
    finally { setSubiendo(false); }
  };

  /*
   * PEGAR AQUÍ TAMBIÉN (mismo criterio que en los archivos, 2026-08-26): el
   * `paste` se escucha en la ventana pero sólo actúa si esta galería está
   * señalada —el ratón encima o el foco dentro— y nunca si el destino es un
   * campo de texto. En esta página hay varios sitios que escuchan el pegado; el
   * que responde tiene que ser aquel al que estás mirando, no todos.
   */
  useEffect(() => {
    if (!puedeEditar || !senalada) return;
    const alPegar = async (e: ClipboardEvent) => {
      if (enCampoDeTexto(e.target)) return;
      const fs = Array.from(e.clipboardData?.files || []);
      if (!fs.length) return;
      e.preventDefault();
      setSubiendo(true); setFallo(null);
      try {
        const r = await subirImagenes(fs);
        if (r.error) throw new Error(r.error);
        await colgar(r.urls);
      } catch (err: any) { setFallo(err.message); }
      finally { setSubiendo(false); }
    };
    window.addEventListener('paste', alPegar);
    return () => window.removeEventListener('paste', alPegar);
  }, [puedeEditar, senalada, proyectoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardarPie = async (id: string) => {
    const texto = borrador.trim();
    setEditando(null);
    const antes = (imagenes || []).find(i => i.id === id)?.descripcion || '';
    if (texto === antes) return;
    setImagenes(l => (l || []).map(i => (i.id === id ? { ...i, descripcion: texto || null } : i)));
    await fetch(`/api/proyectos/${proyectoId}/galeria/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion: texto }),
    }).catch(() => {});
  };

  const quitar = async (im: Imagen) => {
    if (!window.confirm('Quitar esta imagen de la galería. El archivo subido no se borra.')) return;
    setImagenes(l => (l || []).filter(i => i.id !== im.id));
    setAbierta(null);
    await fetch(`/api/proyectos/${proyectoId}/galeria/${im.id}`, {
      method: 'DELETE', credentials: 'include',
    }).catch(() => {});
  };

  /** Mover una imagen un puesto. Se intercambian los dos `orden`, que es lo que
   *  hace que colocar la última la primera no reescriba toda la galería. */
  const mover = async (i: number, hacia: -1 | 1) => {
    const l = imagenes || [];
    const j = i + hacia;
    if (j < 0 || j >= l.length) return;
    const copia = [...l];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setImagenes(copia);
    await Promise.all(copia.map((im, k) =>
      fetch(`/api/proyectos/${proyectoId}/galeria/${im.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden: k }),
      }).catch(() => {})));
  };

  // Mientras carga no se pinta nada: un esqueleto de galería en un proyecto que
  // no tiene ninguna es prometer algo que no va a aparecer.
  if (imagenes === null) return null;
  if (!imagenes.length && !puedeEditar) return null;

  return (
    <div
      className="mt-6"
      onMouseEnter={() => setSenalada(true)}
      onMouseLeave={() => setSenalada(false)}
      onFocus={() => setSenalada(true)}
      onBlur={() => setSenalada(false)}
      tabIndex={puedeEditar ? 0 : undefined}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ImagePlus className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Galería{imagenes.length ? ` · ${imagenes.length}` : ''}
        </p>
        {puedeEditar && (
          <button
            onClick={anadir}
            disabled={subiendo}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40"
          >
            {subiendo ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
            {subiendo ? 'Subiendo…' : 'Añadir imágenes'}
          </button>
        )}
        {puedeEditar && !subiendo && (
          <span className="text-[10.5px] text-slate-300">o pégalas con ⌘V</span>
        )}
      </div>

      {fallo && <p className="mb-2 text-[11px] font-bold text-red-600">{fallo}</p>}

      {!imagenes.length ? (
        <button
          onClick={anadir}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-8 text-xs text-slate-400 transition-colors hover:border-emerald-300 hover:text-emerald-700"
        >
          <ImagePlus className="h-4 w-4" />
          Enseña este proyecto con imágenes
        </button>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {imagenes.map((im, i) => (
            <figure key={im.id} className="group/im relative w-44 shrink-0 sm:w-52">
              <button
                onClick={() => setAbierta(i)}
                className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <img
                  src={im.url}
                  alt={im.descripcion || ''}
                  loading="lazy"
                  className="h-32 w-full object-cover transition-transform duration-300 group-hover/im:scale-[1.04] sm:h-36"
                />
              </button>

              {editando === im.id ? (
                <input
                  autoFocus
                  value={borrador}
                  onChange={e => setBorrador(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') guardarPie(im.id);
                    if (e.key === 'Escape') setEditando(null);
                  }}
                  onBlur={() => guardarPie(im.id)}
                  maxLength={300}
                  placeholder="Qué se ve aquí"
                  className="mt-1.5 w-full border-b border-emerald-400 bg-transparent text-[11px] text-slate-600 outline-none placeholder:text-slate-300"
                />
              ) : im.descripcion ? (
                <figcaption
                  onClick={() => { if (puedeEditar) { setEditando(im.id); setBorrador(im.descripcion || ''); } }}
                  className={cn('mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-500',
                    puedeEditar && 'cursor-text hover:text-slate-800')}
                >
                  {im.descripcion}
                </figcaption>
              ) : puedeEditar ? (
                <button
                  onClick={() => { setEditando(im.id); setBorrador(''); }}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-300 transition-colors hover:text-emerald-700"
                >
                  <Pencil className="h-2.5 w-2.5" /> Describir
                </button>
              ) : null}

              {/* Los mandos salen al pasar por encima: en reposo esto es una
                  galería, no una barra de herramientas con fotos al lado. */}
              {puedeEditar && editando !== im.id && (
                <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover/im:opacity-100 focus-within:opacity-100">
                  <button onClick={() => mover(i, -1)} disabled={i === 0}
                    title="Moverla a la izquierda" aria-label="Moverla a la izquierda"
                    className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-400 shadow-sm hover:text-slate-800 disabled:opacity-30">
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={i === imagenes.length - 1}
                    title="Moverla a la derecha" aria-label="Moverla a la derecha"
                    className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-400 shadow-sm hover:text-slate-800 disabled:opacity-30">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  <button onClick={() => quitar(im)}
                    title="Quitarla de la galería" aria-label="Quitarla de la galería"
                    className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-400 shadow-sm hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </figure>
          ))}
        </div>
      )}

      {abierta !== null && imagenes[abierta] && (
        <Visor
          imagenes={imagenes}
          indice={abierta}
          onIr={setAbierta}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}

/** La imagen en grande. Se cierra con Escape y con un clic fuera, y se pasa de
 *  una a otra con las flechas: quien abre una foto de una galería casi siempre
 *  quiere ver la siguiente. */
function Visor({ imagenes, indice, onIr, onCerrar }: {
  imagenes: Imagen[]; indice: number; onIr: (i: number) => void; onCerrar: () => void;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      if (e.key === 'ArrowLeft' && indice > 0) onIr(indice - 1);
      if (e.key === 'ArrowRight' && indice < imagenes.length - 1) onIr(indice + 1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [indice, imagenes.length, onIr, onCerrar]);

  const im = imagenes[indice];
  return (
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/85 p-5 backdrop-blur-sm"
    >
      <button onClick={onCerrar} aria-label="Cerrar"
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-4 w-4" />
      </button>

      {indice > 0 && (
        <button onClick={e => { e.stopPropagation(); onIr(indice - 1); }} aria-label="Anterior"
          className="absolute left-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {indice < imagenes.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onIr(indice + 1); }} aria-label="Siguiente"
          className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <figure onClick={e => e.stopPropagation()} className="max-h-full max-w-4xl">
        <img src={im.url} alt={im.descripcion || ''} className="mx-auto max-h-[78vh] rounded-2xl object-contain" />
        {im.descripcion && (
          <figcaption className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-white/80">
            {im.descripcion}
          </figcaption>
        )}
        <p className="mt-2 text-center text-[11px] font-bold text-white/40">
          {indice + 1} de {imagenes.length}
        </p>
      </figure>
    </div>
  );
}
