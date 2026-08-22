import { useEffect, useState } from 'react';
import { Loader2, Check, Pencil, Network, ImagePlus, X, FolderKanban, ChevronLeft, ListChecks } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

// ============================================================================
// ¿DÓNDE VA ESTA FOTO? (2026-08-22, Programador 3)
// ============================================================================
// Eugenio, con la aplicación ya instalada en su iPhone: «cuando te lleva a
// cámara que no te salta el editor por defecto, sino que sea tal cual como
// está y que luego te pregunte dónde guardarla, con un selector, en un
// proyecto, o si crear algo nuevo con una herramienta empezando con esa foto o
// vídeo».
//
// LO QUE PASABA ANTES. Hacías la foto y se abría el editor de imagen encima:
// luz, contraste, filtros. Nadie había pedido editar. La foto ya estaba bien y
// lo único que faltaba era decir dónde iba. Editar es una decisión, no un
// peaje.
//
// LO QUE HACE AHORA. Se ve la foto tal cual, y se elige destino. Editar sigue
// estando, pero como un botón que pulsas tú.
//
// LOS PROYECTOS, CORREGIDO (2026-08-22). La primera versión dejó fuera los
// proyectos con este razonamiento: «un proyecto es un tablero de tarjetas, meter
// una foto ahí sería inventarle una tarjeta que nadie ha pedido». Eugenio:
// «te debe permitir meterla en uno de tus proyectos, y dentro de tus proyectos
// en alguna tarea».
//
// Tenía razón y mi razonamiento estaba mal planteado: la foto no va al tablero,
// **va dentro de una tarea concreta**, que es donde el trabajo ocurre. La foto
// del montaje pertenece a «Medidas reales del chasis», no al proyecto entero. Y
// no hace falta inventar nada: una tarea ya guarda notas en `bloques`, el mismo
// sitio donde ya caben las imágenes.

type Lienzo = { id: string; slug: string; title: string; window_count?: number };
type Proyecto = { id: string; slug: string; titulo: string; tarjetas?: number; creador_user_id?: string | null };
type Tarea = { id: string; titulo: string; estado: string; bloques?: any[] };

const ESTADO_LABEL: Record<string, string> = {
  por_hacer: 'por hacer', en_curso: 'en curso', hecho: 'hecho',
};

export type Captura = {
  /** URL ya subida al servidor. */
  url: string;
  tipo: 'imagen' | 'video';
  /** Nombre del fichero original, como título de partida. */
  nombre: string;
};

export function DestinoCaptura({
  captura,
  onEditar,
  onListo,
  onCerrar,
}: {
  captura: Captura;
  /** Solo para imágenes: abre el editor, ahora bajo petición. */
  onEditar?: () => void;
  /** Se ha guardado. Devuelve a dónde, por si quien llama quiere navegar. */
  // La ruta del lienzo va por SLUG (`/esquemas/:slug` en App.tsx), no por id.
  onListo: (destino: { tipo: 'lienzo'; slug: string } | { tipo: 'publicacion'; id: string } | { tipo: 'tarea'; proyecto: string }) => void;
  onCerrar: () => void;
}) {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState(captura.nombre.replace(/\.[^.]+$/, ''));
  const [lienzos, setLienzos] = useState<Lienzo[] | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null);
  // Dos pasos, no dos listas a la vez: elegir proyecto y luego tarea. En una
  // pantalla de móvil, cincuenta tareas de cuatro proyectos juntas no son un
  // selector, son un listado.
  const [proyectoAbierto, setProyectoAbierto] = useState<Proyecto | null>(null);
  const [tareas, setTareas] = useState<Tarea[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    if (!user?.id) { setLienzos([]); return; }
    // `personales=1` incluye «Mi Conocimiento», que es donde la mayoría de la
    // gente va a querer soltar una foto suelta.
    fetch(`/api/graphs?creator_id=${encodeURIComponent(user.id)}&personales=1`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (vivo) setLienzos(Array.isArray(j) ? j : (j.graphs || j.rows || [])); })
      .catch(() => { if (vivo) setLienzos([]); });
    /*
     * SOLO LOS PROYECTOS QUE PUEDES EDITAR.
     *
     * `/api/proyectos` devuelve también los públicos de otras personas, y
     * `PUT /api/roadmap/:id` responde 403 con «Solo quien creó el proyecto puede
     * editar sus tarjetas» (`src/server/roadmap.ts`). Comprobado contra
     * producción: con una cuenta que no es la del creador, 403.
     *
     * Ofrecer un destino que va a rechazarte es peor que no ofrecerlo: has
     * elegido, has esperado, y el error llega después. Se filtra aquí.
     */
    fetch('/api/proyectos', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        const todos: Proyecto[] = Array.isArray(j) ? j : (j.rows || []);
        if (vivo) setProyectos(todos.filter(p => p.creador_user_id && p.creador_user_id === user.id));
      })
      .catch(() => { if (vivo) setProyectos([]); });
    return () => { vivo = false; };
  }, [user?.id]);

  const abrirProyecto = async (p: Proyecto) => {
    setProyectoAbierto(p);
    setTareas(null);
    try {
      const j = await fetch(`/api/roadmap?proyecto=${encodeURIComponent(p.id)}`, { credentials: 'include' }).then(r => r.json());
      setTareas(Array.isArray(j) ? j : (j.rows || j.items || []));
    } catch { setTareas([]); }
  };

  /*
   * A una tarea: la foto se añade como una nota más de esa tarea. Se leen sus
   * bloques actuales y se manda la lista entera con el nuevo al final, porque
   * `PUT /api/roadmap/:id` reemplaza el campo, no añade. Leer-y-reescribir puede
   * pisar una nota que otra persona haya añadido en estos segundos; con una
   * tarea que estás mirando tú, con el móvil en la mano, es un riesgo pequeño y
   * la alternativa —un endpoint que añada— es del área de Programador 1.
   */
  const guardarEnTarea = async (t: Tarea) => {
    setError(null);
    setGuardando(true);
    try {
      const previos = Array.isArray(t.bloques) ? t.bloques : [];
      const r = await fetch(`/api/roadmap/${t.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloques: [...previos, { tipo: captura.tipo, url: captura.url, pie: nombreFinal() }],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido añadir a la tarea.');
      onListo({ tipo: 'tarea', proyecto: proyectoAbierto!.slug });
    } catch (e: any) {
      setError(e.message);
      setGuardando(false);
    }
  };

  const nombreFinal = () =>
    titulo.trim() || (captura.tipo === 'video' ? 'Vídeo sin título' : 'Imagen sin título');

  const config = () =>
    captura.tipo === 'video' ? { video_url: captura.url } : { image_url: captura.url, caption: null };

  /** A un lienzo: una ventana más, en un punto al azar cerca del centro. */
  const guardarEnLienzo = async (lienzo: Lienzo) => {
    setError(null);
    setGuardando(true);
    try {
      const ang = Math.random() * 2 * Math.PI;
      const r = await fetch(`/api/graphs/${lienzo.id}/windows`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nombreFinal(),
          kind: captura.tipo,
          config: config(),
          x: Math.round(Math.cos(ang) * 640 - 128),
          y: Math.round(Math.sin(ang) * 500 - 110),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido guardar en el lienzo.');
      onListo({ tipo: 'lienzo', slug: lienzo.slug });
    } catch (e: any) {
      setError(e.message);
      setGuardando(false);
    }
  };

  /** Suelta: una publicación por sí misma, sin lienzo detrás. */
  const guardarSuelta = async () => {
    setError(null);
    setGuardando(true);
    try {
      const r = await fetch('/api/ventanas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: captura.tipo, titulo: nombreFinal(), config: config() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        // El servidor solo admite `imagen` aquí (lista blanca en
        // `src/server/documentos.ts`, área de Programador 1). Un vídeo suelto
        // falla con 400, y decirlo es más útil que un «no se ha podido».
        throw new Error(
          captura.tipo === 'video'
            ? 'Un vídeo todavía no puede ser una publicación por sí misma. Guárdalo en un lienzo.'
            : (j.error || 'No se ha podido guardar.'),
        );
      }
      onListo({ tipo: 'publicacion', id: j.id });
    } catch (e: any) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-end sm:items-center justify-center"
      onClick={onCerrar}>
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto
                   pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold text-slate-900">¿Dónde la guardamos?</h2>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* La captura, TAL CUAL. Sin filtros, sin recorte, sin nada encima. */}
        <div className="px-5">
          <div className="rounded-2xl overflow-hidden bg-slate-100">
            {captura.tipo === 'video'
              ? <video src={captura.url} controls playsInline className="w-full max-h-[38vh] object-contain" />
              : <img src={captura.url} alt="" className="w-full max-h-[38vh] object-contain" />}
          </div>
        </div>

        <div className="px-5 pt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder={captura.tipo === 'video' ? 'Vídeo sin título' : 'Imagen sin título'}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {error && (
          <p className="mx-5 mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="px-5 pt-4 pb-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Crear algo nuevo</p>

          <Opcion
            icono={ImagePlus}
            titulo={captura.tipo === 'video' ? 'Publicación de vídeo' : 'Publicación de imagen'}
            pie="Por sí misma, sin lienzo detrás"
            onClick={guardarSuelta}
            desactivado={guardando}
          />

          {captura.tipo === 'imagen' && onEditar && (
            <Opcion
              icono={Pencil}
              titulo="Editarla antes"
              pie="Recorte, luz, filtros, texto"
              onClick={onEditar}
              desactivado={guardando}
            />
          )}
        </div>

        <div className="px-5 pt-3 pb-2 space-y-2">
          {!proyectoAbierto ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Añadir a una tarea</p>
              {proyectos === null && (
                <p className="text-sm text-slate-400 flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Buscando tus proyectos…
                </p>
              )}
              {proyectos?.length === 0 && (
                <p className="text-sm text-slate-400 py-2">No tienes proyectos propios. Solo puedes añadir tareas a los que has creado tú.</p>
              )}
              {proyectos?.map(p => (
                <Opcion
                  key={p.id}
                  icono={FolderKanban}
                  titulo={p.titulo}
                  pie={typeof p.tarjetas === 'number' ? `${p.tarjetas} tarea${p.tarjetas === 1 ? '' : 's'}` : undefined}
                  onClick={() => abrirProyecto(p)}
                  desactivado={guardando}
                />
              ))}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setProyectoAbierto(null); setTareas(null); }}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" /> {proyectoAbierto.titulo}
              </button>
              {tareas === null && (
                <p className="text-sm text-slate-400 flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Buscando sus tareas…
                </p>
              )}
              {tareas?.length === 0 && (
                <p className="text-sm text-slate-400 py-2">Este proyecto no tiene tareas todavía.</p>
              )}
              {tareas?.map(t => (
                <Opcion
                  key={t.id}
                  icono={ListChecks}
                  titulo={t.titulo}
                  pie={ESTADO_LABEL[t.estado] || t.estado}
                  onClick={() => guardarEnTarea(t)}
                  desactivado={guardando}
                />
              ))}
            </>
          )}
        </div>

        <div className="px-5 pt-3 pb-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Añadir a un lienzo tuyo</p>

          {lienzos === null && (
            <p className="text-sm text-slate-400 flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando tus lienzos…
            </p>
          )}

          {lienzos !== null && lienzos.length === 0 && (
            <p className="text-sm text-slate-400 py-2">
              Todavía no tienes ningún lienzo. Crea la publicación y podrás moverla más tarde.
            </p>
          )}

          {lienzos?.map(l => (
            <Opcion
              key={l.id}
              icono={Network}
              titulo={l.title}
              pie={typeof l.window_count === 'number' ? `${l.window_count} elementos` : undefined}
              onClick={() => guardarEnLienzo(l)}
              desactivado={guardando}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Opcion({
  icono: Icono, titulo, pie, onClick, desactivado,
}: {
  icono: any; titulo: string; pie?: string; onClick: () => void; desactivado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactivado}
      // 56px de alto: por debajo de eso un pulgar falla, y esto se usa de pie
      // con una mano.
      className={cn(
        'w-full min-h-[56px] flex items-center gap-3 px-3.5 rounded-2xl border text-left transition',
        desactivado
          ? 'border-slate-100 bg-slate-50 text-slate-300'
          : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-800',
      )}
    >
      <Icono className="w-5 h-5 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{titulo}</span>
        {pie && <span className="block text-xs text-slate-400 truncate">{pie}</span>}
      </span>
      {desactivado ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Check className="w-4 h-4 shrink-0 opacity-0" />}
    </button>
  );
}
