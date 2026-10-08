// ============================================================================
// EL HORMIGUERO (2026-08-22, Eugenio: «crea un botón que sea de una hormiga
// […] y ahí permite al usuario crear tareas para el equipo de desarrollo […]
// esta va a ser la forma en la que nos comuniques»)
// ============================================================================
// TRES COLORES Y NADA MÁS: rojo esperando, naranja necesita a una persona,
// verde hecho. No hay «en curso» a propósito — desde fuera, algo empezado y
// algo por empezar son lo mismo (no está), y un estado más solo sirve para que
// parezca que se avanza.
//
// LO NARANJA VA ARRIBA, y lo ordena el servidor. Es lo único de esta lista que
// está parado esperando a una persona; enterrarlo entre lo demás es cómo se
// quedan las cosas paradas una semana sin que nadie lo sepa.
import { useEffect, useRef, useState } from 'react';
import { Bug, Lightbulb, Plus, Loader2, Check, Hand, Circle, Trash2, MessageSquare, Paperclip, X, ImageIcon, Pencil } from 'lucide-react';
import { cn } from '../utils/cn';
import { IconoFeedback } from '../components/ui/IconoFeedback';
import { useAuth, ROLE } from '../contexts/AuthContext';
import { subirArchivo } from '../utils/subir';
import { useVoiceDictation } from '../hooks/useVoiceDictation';
import BotonMicrofono from '../components/ai/BotonMicrofono';

interface Incidencia {
  id: string;
  titulo: string;
  detalle: string | null;
  clase: 'fallo' | 'mejora';
  estado: 'propuesta' | 'esperando' | 'bloqueada' | 'hecha';
  /** La escribió alguien del equipo (un administrador o un programador IA), o
   *  alguien de fuera. Es una foto del momento de escribirla. */
  de_admin?: boolean;
  /** Quién movió el estado o contestó: una persona o un programador IA. */
  respondido_por?: string | null;
  /** 1 detalle · 5 relevante · 10 crítico: lo que la IA debe atender primero. */
  relevancia?: number;
  necesita: string | null;
  respuesta: string | null;
  autor_user_id: string | null;
  autor_nombre: string | null;
  created_at: string;
  /** Capturas y ficheros colgados de esta nota. Siempre una lista: vacía si no
   *  tiene ninguno, nunca `null` (lo garantiza la consulta del servidor). */
  adjuntos?: Adjunto[];
}

interface Adjunto { id: string; url: string; nombre: string; clase: string; bytes: number | string }

const SEMAFORO = {
  // GRIS Y NO UN COLOR DEL SEMÁFORO (2026-08-22, Eugenio: «las creadas por
  // otros usuarios cada X tiempo las revisaremos para que yo las apruebe»). Una
  // propuesta no está en la cola de trabajo: está esperando una DECISIÓN. Si
  // llevara rojo parecería que alguien va tarde con ella.
  propuesta: { punto: 'bg-slate-300',  texto: 'text-slate-500',  fondo: 'bg-slate-50 border-slate-200',   label: 'Por aprobar' },
  esperando: { punto: 'bg-rose-500',   texto: 'text-rose-700',   fondo: 'bg-rose-50 border-rose-200',     label: 'Esperando' },
  bloqueada: { punto: 'bg-amber-500',  texto: 'text-amber-800',  fondo: 'bg-amber-50 border-amber-200',   label: 'Te necesita' },
  hecha:     { punto: 'bg-emerald-500', texto: 'text-emerald-700', fondo: 'bg-emerald-50 border-emerald-200', label: 'Hecha' },
} as const;

/** Cuadro de texto con el mismo dictado por voz del chat de IA. */
function CajaVoz({ valor, onChange, rows, placeholder }: { valor: string; onChange: (v: string) => void; rows: number; placeholder: string }) {
  const base = useRef('');
  const alDictar = (crudo: string, esFinal: boolean) => {
    const texto = crudo.replace(/^\s+/, '');
    const sep = base.current && !base.current.endsWith(' ') ? ' ' : '';
    onChange(base.current + sep + texto);
    if (esFinal) base.current = base.current + sep + texto;
  };
  const v = useVoiceDictation(alDictar);
  return (
    <div className="relative">
      <textarea value={valor} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full pl-3 pr-20 py-2 border border-slate-200 rounded-xl text-sm resize-none leading-snug focus:outline-none focus:border-emerald-300" />
      {v.supported && (
        <div className="absolute right-1 top-1">
          <BotonMicrofono escuchando={v.listening} nivel={v.nivel} error={v.error}
            onPulsar={() => { if (!v.listening) base.current = valor; v.toggle(); }}
            microfonos={v.microfonos} microfono={v.microfono} onElegir={v.setMicrofono} onAbrirLista={v.cargarMicrofonos} />
        </div>
      )}
    </div>
  );
}

function DeslizadorRelevancia({ valor, onChange }: { valor: number; onChange: (n: number) => void }) {
  return (
    <div className="px-1">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-0.5">
        <span>Relevancia</span><span className="text-slate-900">{valor}/10</span>
      </div>
      <input type="range" min={1} max={10} step={1} value={valor} aria-label="Relevancia del 1 al 10"
        onChange={e => onChange(Number(e.target.value))} className="w-full accent-emerald-600" />
      <div className="flex justify-between text-[10px] text-slate-400"><span>1 · detalle</span><span>5 · relevante</span><span>10 · crítico</span></div>
    </div>
  );
}

export default function Hormiguero() {
  const { user, can } = useAuth();
  const esAdmin = can(ROLE.ADMIN);
  const [lista, setLista] = useState<Incidencia[] | null>(null);
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [clase, setClase] = useState<'fallo' | 'mejora'>('fallo');
  const [relevancia, setRelevancia] = useState(5);
  const [editando, setEditando] = useState<{ id: string; titulo: string; detalle: string; clase: 'fallo' | 'mejora'; relevancia: number } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todas' | Incidencia['estado']>('todas');
  /** ══ LOS FICHEROS QUE ACOMPAÑAN A LO QUE ESTÁS ANOTANDO ═════════════════
   *  (2026-08-22, hormiguero: «permite adjuntar archivos cuando se reporta un
   *  bug»). La mitad de los fallos se cuentan mejor con una captura que con un
   *  párrafo.
   *
   *  SE QUEDAN EN LA MANO HASTA QUE LA NOTA EXISTE. Un adjunto cuelga de algo,
   *  y mientras escribes ese algo todavía no tiene id. Así que se guardan aquí
   *  y se suben justo después de crearla: si la creación falla, no queda un
   *  fichero suelto en el servidor sin dueño. */
  const [enLaMano, setEnLaMano] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const elegir = useRef<HTMLInputElement>(null);

  const cargar = () => fetch('/api/incidencias', { credentials: 'include' })
    .then(r => r.json()).then(j => setLista(Array.isArray(j) ? j : [])).catch(() => setLista([]));

  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    if (!titulo.trim()) { setError('Cuéntame en una línea qué pasa.'); return; }
    setGuardando(true); setError(null);
    try {
      const r = await fetch('/api/incidencias', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), detalle: detalle.trim() || null, clase, relevancia }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido anotar.');

      // Y AHORA LOS FICHEROS, con la nota ya creada y con id.
      const adjuntos: Adjunto[] = [];
      if (enLaMano.length) {
        setSubiendo(true);
        for (const f of enLaMano) {
          const sub = await subirArchivo(f);
          if (sub.error) { setError(`«${f.name}» no se ha podido subir: ${sub.error}`); continue; }
          const c = await fetch('/api/archivo', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              incidencia_id: j.id, url: sub.url, nombre: f.name,
              mime: sub.type, bytes: sub.bytes, clase: sub.clase,
            }),
          });
          // SE DICE SI UN FICHERO SE QUEDA FUERA. La nota ya está anotada, así
          // que no se deshace nada; pero callarlo dejaría a quien reporta
          // creyendo que la captura ha llegado.
          if (c.ok) adjuntos.push(await c.json());
          else setError(`«${f.name}» se ha subido pero no se ha podido colgar de la nota.`);
        }
        setSubiendo(false);
      }
      setLista(l => [{ ...j, adjuntos }, ...(l || [])]);
      setTitulo(''); setDetalle(''); setEnLaMano([]); setRelevancia(5);
    } catch (e: any) { setError(e.message); } finally { setGuardando(false); }
  };

  const cambiar = async (i: Incidencia, cambios: Partial<Incidencia>) => {
    const antes = lista;
    setLista(l => (l || []).map(x => (x.id === i.id ? { ...x, ...cambios } : x)));
    try {
      const r = await fetch(`/api/incidencias/${i.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambios),
      });
      if (!r.ok) throw new Error((await r.json())?.error || 'No se ha podido cambiar.');
      cargar();
    } catch (e: any) {
      // SE DESHACE LO PINTADO. Dejar el cambio en pantalla cuando el servidor
      // lo ha rechazado es la interfaz afirmando algo que no ha pasado.
      setError(e.message);
      setLista(antes);
    }
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    if (!editando.titulo.trim()) { setError('El título no puede quedar vacío.'); return; }
    const { id, ...campos } = editando;
    const r = await fetch(`/api/incidencias/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...campos, titulo: campos.titulo.trim(), detalle: campos.detalle.trim() }),
    });
    if (!r.ok) { setError((await r.json().catch(() => null))?.error || 'No se ha podido guardar.'); return; }
    setError(null); setEditando(null); cargar();
  };

  const quitar = async (i: Incidencia) => {
    setLista(l => (l || []).filter(x => x.id !== i.id));
    await fetch(`/api/incidencias/${i.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
  };

  const visibles = (lista || []).filter(i => filtro === 'todas' || i.estado === filtro);
  const cuenta = (e: Incidencia['estado']) => (lista || []).filter(i => i.estado === e).length;

  return (
    <div className="max-w-3xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* FEEDBACK, antes «Hormiguero» (2026-08-22, Eugenio: «pon la palabra
            Feedback en el menú… y llama a esa página FEEDBACK para recoger el
            feedback de los usuarios»).
            El nombre viejo lo entendía quien ya estaba dentro; a quien entra
            hoy, «hormiguero» no le dice dónde contar que algo no funciona. */}
        <h1 className="text-xl font-black tracking-tight text-slate-900 inline-flex items-center gap-2">
          <IconoFeedback className="w-5 h-5 text-emerald-600" /> Feedback
        </h1>
        <p className="text-xs text-slate-400">Lo que falla y lo que falta. Cuéntalo aquí y llega a quien programa.</p>
      </div>

      {/* ANOTAR. Arriba y siempre abierto: si hubiera que pulsar «nuevo» para
          que apareciera el cuadro, la mitad de lo que molesta no se anotaría —
          se anota justo cuando acaba de pasar, o no se anota. */}
      {user ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 mb-5 space-y-2">
          <div className="flex gap-1.5">
            {([['fallo', 'Algo falla', Bug], ['mejora', 'Una idea', Lightbulb]] as const).map(([k, t, I]) => (
              <button key={k} onClick={() => setClase(k)}
                className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                  clase === k ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400')}>
                <I className="w-3.5 h-3.5" /> {t}
              </button>
            ))}
          </div>
          <CajaVoz valor={titulo} onChange={setTitulo} rows={2}
            placeholder={clase === 'fallo' ? 'Qué has hecho y qué ha pasado' : 'Qué te gustaría que hiciera'} />
          <CajaVoz valor={detalle} onChange={setDetalle} rows={2}
            placeholder="Dónde estabas, en qué pantalla, lo que haga falta (opcional)" />
          <DeslizadorRelevancia valor={relevancia} onChange={setRelevancia} />
          {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5">{error}</p>}
          {/* LO QUE LLEVA ADJUNTO, antes de anotarlo. Cada uno con su ✕: si
              te has equivocado de captura, quitarla no puede obligarte a
              empezar de nuevo. */}
          {enLaMano.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {enLaMano.map((f, i) => (
                <span key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600 max-w-full">
                  {f.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 shrink-0 text-slate-400" /> : <Paperclip className="w-3 h-3 shrink-0 text-slate-400" />}
                  <span className="truncate max-w-[10rem]">{f.name}</span>
                  <button onClick={() => setEnLaMano(l => l.filter((_, j) => j !== i))}
                    title="Quitarlo" className="p-0.5 rounded text-slate-400 hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <input
              ref={elegir} type="file" multiple className="hidden"
              onChange={e => {
                setEnLaMano(l => [...l, ...Array.from(e.target.files || [])]);
                // Se limpia el input: sin esto, elegir DOS VECES el mismo
                // fichero no dispara el evento la segunda.
                e.target.value = '';
              }}
            />
            <button onClick={() => elegir.current?.click()}
              title="Adjuntar una captura o un archivo"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 text-sm font-bold transition-colors">
              <Paperclip className="w-4 h-4" /> Adjuntar
            </button>
            <button onClick={crear} disabled={guardando || subiendo || !titulo.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40 transition-colors">
              {guardando || subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {subiendo ? 'Subiendo…' : 'Anotar'}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400 mb-5">
          Inicia sesión para anotar algo.
        </p>
      )}

      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto [scrollbar-width:none]">
        {([['todas', 'Todas'], ['bloqueada', SEMAFORO.bloqueada.label], ['esperando', SEMAFORO.esperando.label], ['propuesta', SEMAFORO.propuesta.label], ['hecha', SEMAFORO.hecha.label]] as const).map(([k, t]) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={cn('shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors',
              filtro === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            {k !== 'todas' && <span className={cn('w-2 h-2 rounded-full', SEMAFORO[k].punto)} />}
            {t}
            {k !== 'todas' && <span className="opacity-60">{cuenta(k)}</span>}
          </button>
        ))}
      </div>

      {lista === null ? (
        <p className="text-sm text-slate-300 italic py-12 text-center">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">
          {filtro === 'todas' ? 'Nada anotado todavía.' : `Nada en «${SEMAFORO[filtro as Incidencia['estado']].label}».`}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibles.map(i => {
            const s = SEMAFORO[i.estado];
            return (
              <li key={i.id} className={cn('rounded-2xl border p-3', i.estado === 'bloqueada' ? s.fondo : 'border-slate-200 bg-white')}>
                <div className="flex items-start gap-2.5">
                  <span className={cn('mt-1.5 w-2.5 h-2.5 rounded-full shrink-0', s.punto)} title={s.label} />
                  {editando?.id === i.id ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex gap-1.5">
                      {([['fallo', 'Algo falla'], ['mejora', 'Una idea']] as const).map(([k, t]) => (
                        <button key={k} onClick={() => setEditando({ ...editando, clase: k })}
                          className={cn('px-3 py-1 rounded-full text-xs font-bold border', editando.clase === k ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600')}>{t}</button>
                      ))}
                    </div>
                    <CajaVoz valor={editando.titulo} onChange={v => setEditando(e => e && { ...e, titulo: v })} rows={2} placeholder="Qué pasa" />
                    <CajaVoz valor={editando.detalle} onChange={v => setEditando(e => e && { ...e, detalle: v })} rows={2} placeholder="Detalle (opcional)" />
                    <DeslizadorRelevancia valor={editando.relevancia} onChange={n => setEditando(e => e && { ...e, relevancia: n })} />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditando(null)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500">Cancelar</button>
                      <button onClick={guardarEdicion} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">Guardar</button>
                    </div>
                  </div>
                  ) : (
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-bold leading-snug', i.estado === 'hecha' ? 'text-slate-400 line-through' : 'text-slate-800')}>
                      <span title={`Relevancia ${i.relevancia ?? 5} de 10`}
                        className={cn('inline-block mr-1.5 px-1.5 rounded-md text-[10px] font-black align-middle no-underline',
                          (i.relevancia ?? 5) >= 8 ? 'bg-rose-100 text-rose-700' : (i.relevancia ?? 5) >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500')}>
                        {i.relevancia ?? 5}
                      </span>
                      {i.titulo}
                    </p>
                    {i.detalle && <p className="text-[11px] text-slate-500 leading-snug mt-0.5 whitespace-pre-wrap">{i.detalle}</p>}

                    {/* LO QUE HACE FALTA, bien visible. Es la razón de que esté
                        parada, y el motivo de que este canal exista. */}
                    {i.estado === 'bloqueada' && i.necesita && (
                      <p className="mt-1.5 inline-flex items-start gap-1.5 text-[11px] font-bold text-amber-800">
                        <Hand className="w-3.5 h-3.5 shrink-0 mt-px" /> {i.necesita}
                      </p>
                    )}
                    {i.respuesta && (
                      <p className="mt-1.5 inline-flex items-start gap-1.5 text-[11px] text-slate-600">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" /> {i.respuesta}
                      </p>
                    )}

                    {/* ══ LO QUE SE ADJUNTÓ ═════════════════════════════════
                        Las imágenes se ven; lo demás es un enlace con su
                        nombre. Una captura de un fallo hay que MIRARLA, y
                        obligar a abrirla en otra pestaña para eso es pedirle
                        un clic a quien ya se ha tomado la molestia de
                        adjuntarla. */}
                    {!!i.adjuntos?.length && (
                      <div className="flex flex-wrap items-start gap-2 mt-2">
                        {i.adjuntos.map(a => (a.clase === 'imagen' ? (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" title={a.nombre}>
                            <img src={a.url} alt={a.nombre} loading="lazy"
                              className="h-24 w-auto max-w-[12rem] object-cover rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors" />
                          </a>
                        ) : (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                            <Paperclip className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[12rem]">{a.nombre}</span>
                          </a>
                        )))}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-300 mt-1">
                      {i.clase === 'fallo' ? 'Fallo' : 'Idea'} · {i.autor_nombre || 'Alguien'}
                      {/* DE DÓNDE VIENE (2026-08-22). «Del equipo» es lo que se
                          atiende directo; lo que entra por el buzón pasa antes
                          por una decisión. Se dice en la propia nota para que no
                          haya que deducirlo del color. */}
                      {i.de_admin === false && <span className="text-slate-400"> · propuesta de fuera</span>}
                      {' · '}
                      {new Date(i.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      {/* QUIÉN LA CONTESTÓ. Con dos programadores IA trabajando
                          a la vez, «hecha» sin decir por quién es justo lo que
                          hay que poder distinguir. */}
                      {i.respondido_por && <span className="text-slate-400"> · lo lleva {i.respondido_por}</span>}
                    </p>
                  </div>
                  )}

                  <div className={cn('flex items-center gap-0.5 shrink-0', editando?.id === i.id && 'hidden')}>
                    {/* EL ESTADO SOLO LO MUEVE QUIEN PROGRAMA. Si lo moviera
                        quien la escribe, el tablero dejaría de decir lo que de
                        verdad está hecho. */}
                    {esAdmin && (
                      <>
                        {/* APROBAR: pasar una propuesta a la cola de trabajo.
                            Solo sale en las que están por aprobar; en las demás
                            sería un botón más que no hace nada nuevo. */}
                        {i.estado === 'propuesta' && (
                          <button onClick={() => cambiar(i, { estado: 'esperando' })}
                            title="Aprobarla: pasa a la cola de trabajo"
                            className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors">
                            <Check className="w-3.5 h-3.5" /> Aprobar
                          </button>
                        )}
                        <button onClick={() => cambiar(i, { estado: 'esperando' })} title="Esperando"
                          className={cn('w-7 h-7 grid place-items-center rounded-lg transition-colors',
                            i.estado === 'esperando' ? 'bg-rose-100 text-rose-700' : 'text-slate-300 hover:bg-slate-100')}>
                          <Circle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const q = window.prompt('¿Qué hace falta de una persona?', i.necesita || '');
                            if (q && q.trim()) cambiar(i, { estado: 'bloqueada', necesita: q.trim() });
                          }}
                          title="Necesita a una persona"
                          className={cn('w-7 h-7 grid place-items-center rounded-lg transition-colors',
                            i.estado === 'bloqueada' ? 'bg-amber-100 text-amber-800' : 'text-slate-300 hover:bg-slate-100')}>
                          <Hand className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => cambiar(i, { estado: 'hecha' })} title="Hecha"
                          className={cn('w-7 h-7 grid place-items-center rounded-lg transition-colors',
                            i.estado === 'hecha' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-300 hover:bg-slate-100')}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {(esAdmin || i.autor_user_id === user?.id) && (
                      <button onClick={() => setEditando({ id: i.id, titulo: i.titulo, detalle: i.detalle || '', clase: i.clase, relevancia: i.relevancia ?? 5 })}
                        title="Editar" aria-label="Editar"
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-300 hover:text-emerald-700 hover:bg-slate-100 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(esAdmin || i.autor_user_id === user?.id) && (
                      <button onClick={() => quitar(i)} title="Quitar"
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
