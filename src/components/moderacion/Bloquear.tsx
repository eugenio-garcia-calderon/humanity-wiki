import { useState } from 'react';
import { Ban, Loader2, X } from 'lucide-react';

/*
 * BLOQUEAR A UNA PERSONA (2026-08-22, Programador 3)
 * ============================================================================
 * DENUNCIAR Y BLOQUEAR NO SON LO MISMO, y Apple pide las dos porque resuelven
 * cosas distintas. Denunciar es sobre UNA COSA y la juzga otra persona, más
 * tarde. Bloquear es sobre UNA PERSONA, lo decide quien lo pulsa, y surte
 * efecto en el momento. Quien está siendo molestado necesita lo segundo: no
 * quiere abrir un expediente, quiere dejar de verle hoy.
 *
 * SE DICE QUÉ HACE ANTES DE HACERLO. Un bloqueo que sorprende a quien lo puso
 * es peor que no tenerlo: la gente lo prueba, ve desaparecer media pantalla y
 * no sabe cómo volver atrás. Por eso la lista de abajo, y por eso «Se puede
 * deshacer» está escrito antes del botón y no después.
 *
 * NO SE AVISA A LA OTRA PERSONA. No hay notificación, a propósito: avisar
 * convierte el bloqueo en una provocación, que es justo de lo que huye quien lo
 * pulsa. El servidor tampoco deja saber quién te ha bloqueado a ti.
 */

export function Bloquear({
  usuarioId,
  nombre,
  onCerrar,
  onBloqueado,
}: {
  usuarioId: string;
  nombre?: string | null;
  onCerrar: () => void;
  /** Para que la pantalla de detrás recargue: lo suyo acaba de dejar de existir. */
  onBloqueado?: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quien = nombre?.trim() || 'esta persona';

  const bloquear = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch('/api/bloqueos', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuarioId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido bloquear.');
      onBloqueado?.();
      onCerrar();
    } catch (e: any) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-end sm:items-center justify-center" onClick={onCerrar}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto
                   pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-600" /> Bloquear a {quien}
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-2 -mr-2 min-h-[44px] text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-sm text-slate-600 leading-relaxed">A partir de ahora:</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li className="flex gap-2"><span className="text-rose-500 font-black">·</span> No verás nada suyo, ni sus comentarios.</li>
            <li className="flex gap-2"><span className="text-rose-500 font-black">·</span> No verá nada tuyo.</li>
            <li className="flex gap-2"><span className="text-rose-500 font-black">·</span> No podéis escribiros ni seguiros.</li>
          </ul>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            <strong className="text-slate-700">No se le avisa</strong> de que le has
            bloqueado. Y se puede deshacer cuando quieras, en{' '}
            <strong className="text-slate-700">Configuración</strong>.
          </p>

          {error && (
            <p className="mt-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={onCerrar}
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={bloquear}
              disabled={enviando}
              className="flex-1 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-60"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              Bloquear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
