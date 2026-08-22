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
import { useEffect, useState } from 'react';
import { Bug, Lightbulb, Plus, Loader2, Check, Hand, Circle, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth, ROLE } from '../contexts/AuthContext';

interface Incidencia {
  id: string;
  titulo: string;
  detalle: string | null;
  clase: 'fallo' | 'mejora';
  estado: 'esperando' | 'bloqueada' | 'hecha';
  necesita: string | null;
  respuesta: string | null;
  autor_user_id: string | null;
  autor_nombre: string | null;
  created_at: string;
}

const SEMAFORO = {
  esperando: { punto: 'bg-rose-500',   texto: 'text-rose-700',   fondo: 'bg-rose-50 border-rose-200',     label: 'Esperando' },
  bloqueada: { punto: 'bg-amber-500',  texto: 'text-amber-800',  fondo: 'bg-amber-50 border-amber-200',   label: 'Te necesita' },
  hecha:     { punto: 'bg-emerald-500', texto: 'text-emerald-700', fondo: 'bg-emerald-50 border-emerald-200', label: 'Hecha' },
} as const;

export default function Hormiguero() {
  const { user, can } = useAuth();
  const esAdmin = can(ROLE.ADMIN);
  const [lista, setLista] = useState<Incidencia[] | null>(null);
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [clase, setClase] = useState<'fallo' | 'mejora'>('fallo');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todas' | Incidencia['estado']>('todas');

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
        body: JSON.stringify({ titulo: titulo.trim(), detalle: detalle.trim() || null, clase }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido anotar.');
      setLista(l => [j, ...(l || [])]);
      setTitulo(''); setDetalle('');
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

  const quitar = async (i: Incidencia) => {
    setLista(l => (l || []).filter(x => x.id !== i.id));
    await fetch(`/api/incidencias/${i.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
  };

  const visibles = (lista || []).filter(i => filtro === 'todas' || i.estado === filtro);
  const cuenta = (e: Incidencia['estado']) => (lista || []).filter(i => i.estado === e).length;

  return (
    <div className="max-w-3xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-xl font-black tracking-tight text-slate-900 inline-flex items-center gap-2">
          <Bug className="w-5 h-5 text-emerald-600" /> Hormiguero
        </h1>
        <p className="text-xs text-slate-400">Lo que falla y lo que falta. Aquí se habla con quien programa.</p>
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
          <textarea
            value={titulo} onChange={e => setTitulo(e.target.value)} rows={2}
            placeholder={clase === 'fallo' ? 'Qué has hecho y qué ha pasado' : 'Qué te gustaría que hiciera'}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none leading-snug focus:outline-none focus:border-emerald-300"
          />
          <textarea
            value={detalle} onChange={e => setDetalle(e.target.value)} rows={2}
            placeholder="Dónde estabas, en qué pantalla, lo que haga falta (opcional)"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none leading-snug focus:outline-none focus:border-emerald-300"
          />
          {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5">{error}</p>}
          <div className="flex justify-end">
            <button onClick={crear} disabled={guardando || !titulo.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40 transition-colors">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Anotar
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400 mb-5">
          Inicia sesión para anotar algo.
        </p>
      )}

      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto [scrollbar-width:none]">
        {([['todas', 'Todas'], ['bloqueada', SEMAFORO.bloqueada.label], ['esperando', SEMAFORO.esperando.label], ['hecha', SEMAFORO.hecha.label]] as const).map(([k, t]) => (
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
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-bold leading-snug', i.estado === 'hecha' ? 'text-slate-400 line-through' : 'text-slate-800')}>
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

                    <p className="text-[10px] text-slate-300 mt-1">
                      {i.clase === 'fallo' ? 'Fallo' : 'Idea'} · {i.autor_nombre || 'Alguien'} ·{' '}
                      {new Date(i.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* EL ESTADO SOLO LO MUEVE QUIEN PROGRAMA. Si lo moviera
                        quien la escribe, el tablero dejaría de decir lo que de
                        verdad está hecho. */}
                    {esAdmin && (
                      <>
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
