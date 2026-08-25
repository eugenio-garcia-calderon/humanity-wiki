import { useEffect, useState } from 'react';
import { X, Loader2, Check, ImagePlus, Trash2 } from 'lucide-react';
import Icono, { esImagen } from '../ui/Icono';
import SelectorDeIcono from '../ui/SelectorDeIcono';
import { iconoDeProyecto } from '../../utils/iconoDeNombre';
import { elegirYSubirImagenes } from '../../utils/elegirImagen';

// ============================================================================
// EDITAR UN PROYECTO SIN ENTRAR EN ÉL (2026-08-26)
// ============================================================================
// Eugenio: «crea un botón de tres puntitos para editar las tarjetas de los
// proyectos desde la página de proyectos general, donde se pueda editar el
// icono, el nombre, la descripción y la imagen de portada, sin tener que entrar
// en cada proyecto».
//
// ── LAS CUATRO COSAS SE GUARDAN DE UNA VEZ ─────────────────────────────────
// Un solo `PUT /api/proyectos/:id` con los cuatro campos. La alternativa era
// llamar dos veces —el nombre y el icono van por `/api/elemento`, la
// descripción y la portada por `/api/proyectos`— y eso es un guardado que
// puede quedarse a medias: la portada puesta y el nombre no, sin que nadie
// pueda saber cuál de los dos falló. Por eso `PUT /api/proyectos/:id` aprendió
// a escribir `icono` el mismo día que esta ventana.
//
// ── LO QUE SE VE ES LO QUE SE VA A VER ─────────────────────────────────────
// La portada se enseña aquí con el mismo recorte que tendrá en la tarjeta. Un
// selector que sólo enseña el resultado en otra pantalla convierte cada cambio
// en un viaje de ida y vuelta para comprobar si has acertado.

export default function EditarProyecto({ proyecto, onHecho, onCerrar }: {
  proyecto: any;
  /** Se avisa con lo que quedó, para repintar la tarjeta sin recargar. */
  onHecho: (cambios: { titulo: string; descripcion: string | null; icono: string | null; portada_url: string | null }) => void;
  onCerrar: () => void;
}) {
  const [titulo, setTitulo] = useState<string>(proyecto.titulo || '');
  const [descripcion, setDescripcion] = useState<string>(proyecto.descripcion || '');
  // Se parte del icono que SE VE en la tarjeta, no del que hay guardado: un
  // proyecto sin icono enseña el que le toca a su nombre, y si aquí apareciera
  // vacío, guardar sin tocar nada cambiaría lo que se ve.
  const [icono, setIcono] = useState<string | null>(iconoDeProyecto(proyecto.icono, proyecto.titulo));
  const [portada, setPortada] = useState<string | null>(proyecto.portada_url || null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [onCerrar]);

  const elegirPortada = async () => {
    setSubiendo(true); setError(null);
    try {
      const sub = await elegirYSubirImagenes(false);
      if (sub.error) { setError(sub.error); return; }
      if (sub.urls.length) setPortada(sub.urls[0]);
    } finally { setSubiendo(false); }
  };

  const guardar = async () => {
    const n = titulo.trim();
    if (!n) { setError('El nombre no puede quedar vacío.'); return; }
    setGuardando(true); setError(null);
    // La descripción vacía se manda como cadena vacía y no como `null`: aquí
    // `null` significa «no lo toques», así que borrarla habría sido imposible.
    const cambios = {
      titulo: n,
      descripcion: descripcion.trim(),
      icono,
      portada_url: portada,
    };
    try {
      const r = await fetch(`/api/proyectos/${proyecto.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setError(d?.error || 'No se ha podido guardar.'); return; }
      // El menú lateral enseña los proyectos por su nombre e icono: que se
      // entere, o seguirá diciendo el de antes hasta que alguien recargue.
      window.dispatchEvent(new Event('humanity:menu-cambiado'));
      onHecho({ ...cambios, descripcion: cambios.descripcion || null });
      onCerrar();
    } catch {
      setError('No se ha podido guardar.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/30 p-4 backdrop-blur-[1px]"
      onClick={onCerrar}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-black text-slate-900">Editar proyecto</h2>
          <button onClick={onCerrar} disabled={guardando}
            className="ml-auto p-1 text-slate-400 hover:text-slate-600 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); guardar(); }}>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
              {icono ? <Icono valor={icono} tamano={esImagen(icono) ? 36 : 22} /> : <span className="text-lg text-slate-300">·</span>}
            </span>
            <input
              autoFocus
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Nombre del proyecto"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none"
            />
          </div>

          <p className="mb-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Descripción</p>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="Una línea que diga de qué va este proyecto"
            className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-emerald-300 focus:outline-none"
          />

          <p className="mb-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Portada</p>
          {portada ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200">
              <img src={portada} alt="" className="h-24 w-full object-cover" />
              <div className="absolute right-1.5 top-1.5 flex gap-1">
                <button type="button" onClick={elegirPortada} disabled={subiendo}
                  title="Cambiar la portada" aria-label="Cambiar la portada"
                  className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm hover:text-emerald-700 disabled:opacity-40">
                  {subiendo ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                </button>
                <button type="button" onClick={() => setPortada(null)} disabled={subiendo}
                  title="Quitar la portada" aria-label="Quitar la portada"
                  className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm hover:text-rose-600 disabled:opacity-40">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={elegirPortada} disabled={subiendo}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-5 text-xs text-slate-400 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40">
              {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {subiendo ? 'Subiendo…' : 'Poner una portada'}
            </button>
          )}

          <div className="mt-3">
            <SelectorDeIcono valor={icono} onElegir={setIcono} alto="max-h-32" />
          </div>

          {error && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">{error}</p>
          )}

          <button type="submit" disabled={guardando || !titulo.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40">
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
