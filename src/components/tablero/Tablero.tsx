// ============================================================================
// UN TABLERO, TRES COLORES — reutilizable por área (2026-08-22, prog6)
// ============================================================================
// El Hormiguero (`src/pages/Hormiguero.tsx`) es el original y se queda como
// está: tiene adjuntos, respuestas y el buzón de propuestas de fuera. Esto es
// la parte que se repite —la lista con su semáforo— para los tableros del
// equipo: `seguridad` y `servidores`.
//
// LOS MISMOS TRES COLORES Y LAS MISMAS PALABRAS, a propósito. Eugenio pidió
// «un kanban como el del hormiguero»: si este dijera «pendiente» donde el otro
// dice «esperando», serían dos tableros que hay que aprender por separado.
//
// LO QUE ESTE NO TIENE, y es una decisión, no un olvido: adjuntos, comentarios
// y el estado «por aprobar». Aquí no escribe gente de fuera —el servidor solo
// deja crear al equipo—, así que un buzón de propuestas no tendría quien lo
// llenara. Si algún día lo tiene, se trae del Hormiguero en vez de inventarlo.
import { useEffect, useState } from 'react';
import { Loader2, Plus, Check, Hand, Circle, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth, ROLE } from '../../contexts/AuthContext';

export interface NotaTablero {
  id: string;
  titulo: string;
  detalle: string | null;
  clase: 'fallo' | 'mejora';
  estado: 'propuesta' | 'esperando' | 'bloqueada' | 'hecha';
  necesita: string | null;
  respuesta: string | null;
  respondido_por: string | null;
  created_at: string;
}

// Copiado del Hormiguero deliberadamente, no importado de él: si alguien cambia
// allí el naranja por otra cosa, quiero que aquí siga significando lo mismo
// hasta que alguien lo decida. Son 4 líneas; compartirlas ataría dos pantallas
// que pueden querer evolucionar por separado.
const SEMAFORO = {
  propuesta: { punto: 'bg-slate-300', texto: 'text-slate-500', fondo: 'bg-slate-50 border-slate-200', label: 'Por aprobar' },
  esperando: { punto: 'bg-rose-500',  texto: 'text-rose-700',  fondo: 'bg-rose-50 border-rose-200',   label: 'Esperando' },
  bloqueada: { punto: 'bg-amber-500', texto: 'text-amber-800', fondo: 'bg-amber-50 border-amber-200', label: 'Te necesita' },
  hecha:     { punto: 'bg-emerald-500', texto: 'text-emerald-700', fondo: 'bg-emerald-50 border-emerald-200', label: 'Hecha' },
} as const;

interface Props {
  /** `seguridad` o `servidores`. El servidor decide quién puede ver cada una. */
  area: string;
  /** Qué poner cuando no hay nada. Un tablero vacío sin explicación parece roto. */
  vacio?: string;
}

export default function Tablero({ area, vacio = 'Nada anotado todavía.' }: Props) {
  const { user } = useAuth();
  const admin = (user?.roleLevel ?? 0) >= ROLE.ADMIN;
  const [lista, setLista] = useState<NotaTablero[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const r = await fetch(`/api/incidencias?area=${encodeURIComponent(area)}`, { credentials: 'include' });
      if (!r.ok) {
        // 401 y 403 no son un fallo que arreglar: son la respuesta correcta a
        // quien no puede ver este tablero. Se dicen con palabras, no con un
        // «error 403» que no le sirve a nadie.
        setError(r.status === 401 ? 'Inicia sesión para ver este tablero.'
               : r.status === 403 ? 'Este tablero es del equipo.'
               : 'No se ha podido cargar el tablero.');
        setLista([]);
        return;
      }
      setError(null);
      setLista(await r.json());
    } catch {
      setError('No se ha podido cargar el tablero.');
      setLista([]);
    }
  };

  useEffect(() => { setLista(null); cargar(); /* eslint-disable-next-line */ }, [area]);

  const crear = async () => {
    if (!titulo.trim() || guardando) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/incidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ titulo, detalle: detalle || null, clase: 'mejora', area }),
      });
      if (r.ok) { setTitulo(''); setDetalle(''); setCreando(false); await cargar(); }
    } finally { setGuardando(false); }
  };

  const mover = async (id: string, estado: NotaTablero['estado'], necesita?: string) => {
    await fetch(`/api/incidencias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(necesita ? { estado, necesita } : { estado }),
    });
    await cargar();
  };

  if (lista === null) {
    return <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando el tablero…
    </div>;
  }

  if (error) {
    return <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{error}</p>;
  }

  const cuenta = (e: NotaTablero['estado']) => lista.filter(i => i.estado === e).length;

  return (
    <div className="space-y-3">
      {/* El recuento antes de la lista: de un vistazo, cuánto hay parado
          esperando a una persona, que es el único número que hace actuar. */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {(['bloqueada', 'esperando', 'hecha'] as const).map(e => (
          <span key={e} className="inline-flex items-center gap-1.5 text-slate-500">
            <span className={cn('w-2 h-2 rounded-full', SEMAFORO[e].punto)} />
            {cuenta(e)} {SEMAFORO[e].label.toLowerCase()}
          </span>
        ))}
        {admin && (
          <button onClick={() => setCreando(o => !o)}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-bold text-slate-600 hover:bg-slate-50">
            {creando ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {creando ? 'Cancelar' : 'Añadir tarea'}
          </button>
        )}
      </div>

      {creando && admin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="Qué hay que hacer, en una línea"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={detalle} onChange={e => setDetalle(e.target.value)}
            placeholder="Detalle (opcional)" rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button onClick={crear} disabled={!titulo.trim() || guardando}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40">
            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Anotar
          </button>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">{vacio}</p>
      ) : (
        <ul className="space-y-2">
          {lista.map(i => {
            const s = SEMAFORO[i.estado];
            return (
              <li key={i.id} className={cn('rounded-2xl border p-3', i.estado === 'bloqueada' ? s.fondo : 'border-slate-200 bg-white')}>
                <div className="flex items-start gap-2">
                  <span className={cn('mt-1.5 w-2 h-2 shrink-0 rounded-full', s.punto)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-bold leading-snug',
                      i.estado === 'hecha' ? 'text-slate-400 line-through' : 'text-slate-800')}>
                      {i.titulo}
                    </p>
                    {i.detalle && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{i.detalle}</p>}
                    {/* «Te necesita» SIN decir para qué es el problema que este
                        campo resuelve, igual que en el Hormiguero. */}
                    {i.estado === 'bloqueada' && i.necesita && (
                      <p className="mt-1.5 rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold text-amber-800">
                        Hace falta: {i.necesita}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">
                      <span className={s.texto}>{s.label}</span>
                      {i.respondido_por && <> · {i.respondido_por}</>}
                    </p>
                  </div>
                  {admin && i.estado !== 'hecha' && (
                    <div className="flex shrink-0 gap-1">
                      {i.estado !== 'bloqueada' && (
                        <button onClick={() => {
                            const q = window.prompt('¿Qué hace falta, y de quién?');
                            if (q?.trim()) mover(i.id, 'bloqueada', q.trim());
                          }}
                          title="Marcar que necesita a una persona"
                          className="rounded-full p-1.5 text-amber-600 hover:bg-amber-50"><Hand className="w-3.5 h-3.5" /></button>
                      )}
                      {i.estado !== 'esperando' && (
                        <button onClick={() => mover(i.id, 'esperando')} title="Devolver a la cola"
                          className="rounded-full p-1.5 text-rose-600 hover:bg-rose-50"><Circle className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => mover(i.id, 'hecha')} title="Marcar hecha"
                        className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-50"><Check className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
