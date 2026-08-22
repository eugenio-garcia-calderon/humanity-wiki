import { useEffect, useState } from 'react';
import { Archive, Check, Flag, Loader2, RotateCcw, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/*
 * LA COLA DE DENUNCIAS (2026-08-22, Programador 3)
 * ============================================================================
 * QUÉ ARREGLA, Y ERA PEOR QUE UN HUECO. `POST /api/report` existía desde
 * `0009` y respondía **«El contenido queda marcado para revisión»** — una
 * promesa de un proceso que no existía, porque ninguna pantalla leía esa tabla.
 * No era una funcionalidad a medias: era una frase falsa contestada por el
 * servidor durante semanas. La tabla tenía cero filas, así que a nadie se le
 * llegó a mentir.
 *
 * Apple exige que **alguien revise** las denuncias. Una denuncia que nadie lee
 * cuenta como no tenerla.
 *
 * POR QUÉ AQUÍ Y NO EN UNA PÁGINA PROPIA. Una pantalla nueva es una pantalla que
 * hay que acordarse de abrir. Feedback ya es donde el equipo mira lo que llega,
 * y se entra por costumbre. Como pestaña, quien puede revisarlas las ve al
 * entrar a lo que ya iba a entrar.
 *
 * PERO EN SU PROPIA LISTA, NO MEZCLADAS con las notas del hormiguero: «algo
 * falla» y «alguien ha denunciado esto» se leen distinto y se atienden distinto
 * — y la denuncia lleva un reloj que la nota no lleva. Una nota puede esperar
 * tres días; una denuncia esperando tres días es contenido en pantalla que
 * alguien ya dijo que sobraba. Juntas, las dos se entierran.
 *
 * NIVEL 3 Y NO ADMINISTRADOR (decisión de Programador 1, y es la correcta):
 * una cola que se para cuando duerme una persona no es una cola, es un cuello.
 */

interface Denuncia {
  id: number;
  entity_type: string;
  entity_id: string;
  /** Null si el servidor no reconoce el tipo. Entonces se pinta el id, sin inventar. */
  titulo: string | null;
  reason: string | null;
  status: 'abierto' | 'revisado' | 'descartado';
  created_at: string;
  denunciante: string | null;
  revisado_por: string | null;
  /** Lo denunciado ya está archivado o en la papelera. */
  ya_retirado: boolean;
}

/** Cuánto lleva esperando, que es lo que convierte el reloj en algo visible. */
function espera(desde: string): { texto: string; urgente: boolean } {
  const h = (Date.now() - new Date(desde).getTime()) / 3600000;
  if (h < 1) return { texto: 'hace menos de una hora', urgente: false };
  if (h < 24) return { texto: `hace ${Math.round(h)} h`, urgente: h >= 12 };
  const d = Math.round(h / 24);
  return { texto: `hace ${d} día${d === 1 ? '' : 's'}`, urgente: true };
}

export function ColaDenuncias() {
  const [lista, setLista] = useState<Denuncia[] | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = () =>
    fetch('/api/reports', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setLista(Array.isArray(j) ? j : (j.rows || [])))
      .catch(() => setLista([]));

  useEffect(() => { cargar(); }, []);

  const marcar = async (d: Denuncia, status: Denuncia['status']) => {
    setOcupada(d.id);
    setError(null);
    try {
      const r = await fetch(`/api/reports/${d.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || 'No se ha podido guardar.');
      }
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupada(null);
    }
  };

  if (lista === null) {
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2 py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando denuncias…
      </p>
    );
  }

  const abiertas = lista.filter(d => d.status === 'abierto');

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {lista.length === 0 && (
        <div className="text-center py-12">
          <Flag className="w-7 h-7 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay denuncias. Bien.</p>
        </div>
      )}

      {abiertas.length > 0 && (
        <p className="text-xs text-slate-500">
          <strong className="text-slate-800">{abiertas.length}</strong> sin revisar.
          El contenido denunciado <strong className="text-slate-800">no se ha quitado</strong>:
          quitar algo por una denuncia le daría a cualquiera el poder de borrar lo de otro.
        </p>
      )}

      <ul className="space-y-2">
        {lista.map(d => {
          const t = espera(d.created_at);
          const abierta = d.status === 'abierto';
          return (
            <li
              key={d.id}
              className={cn(
                'rounded-2xl border p-3',
                abierta ? (t.urgente ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white') : 'border-slate-100 bg-slate-50/60',
              )}
            >
              <div className="flex items-start gap-2">
                <Flag className={cn('w-4 h-4 shrink-0 mt-0.5', abierta ? 'text-rose-500' : 'text-slate-300')} />
                <div className="min-w-0 flex-1">
                  {/* El título si el servidor lo conoce; si no, el id, sin inventar. */}
                  <p className="text-sm font-semibold text-slate-800 leading-snug break-words">
                    {d.titulo || <span className="font-mono text-xs text-slate-500">{d.entity_type} · {d.entity_id}</span>}
                  </p>
                  {d.reason && <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">{d.reason}</p>}
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {d.denunciante ? `Lo denunció ${d.denunciante}` : 'Denuncia anónima'} ·{' '}
                    <span className={cn(abierta && t.urgente && 'font-bold text-rose-600')}>{t.texto}</span>
                    {d.status !== 'abierto' && (
                      <> · {d.status === 'revisado' ? 'revisada' : 'descartada'}
                        {d.revisado_por ? ` por ${d.revisado_por}` : ''}</>
                    )}
                  </p>
                  {d.ya_retirado && (
                    /* Sin esto, quien revisa busca algo que ya no está y no puede
                       distinguir «ya se resolvió» de «no lo encuentro». */
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      <Archive className="w-3 h-3" /> Este contenido ya está archivado o en la papelera
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {abierta ? (
                  <>
                    <Boton icono={Check} texto="Revisada" cargando={ocupada === d.id}
                      onClick={() => marcar(d, 'revisado')} tono="verde" />
                    <Boton icono={X} texto="Descartar" cargando={ocupada === d.id}
                      onClick={() => marcar(d, 'descartado')} tono="gris" />
                  </>
                ) : (
                  <Boton icono={RotateCcw} texto="Reabrir" cargando={ocupada === d.id}
                    onClick={() => marcar(d, 'abierto')} tono="gris" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Boton({
  icono: I, texto, onClick, cargando, tono,
}: { icono: any; texto: string; onClick: () => void; cargando?: boolean; tono: 'verde' | 'gris' }) {
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      className={cn(
        'min-h-[44px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-colors disabled:opacity-40',
        tono === 'verde'
          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50',
      )}
    >
      {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <I className="w-3.5 h-3.5" />}
      {texto}
    </button>
  );
}
