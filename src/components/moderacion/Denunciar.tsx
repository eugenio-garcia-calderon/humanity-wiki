import { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/*
 * DENUNCIAR UNA PUBLICACIÓN (2026-08-22, Programador 3)
 * ============================================================================
 * LO EXIGE APPLE, y por una razón que no es burocrática: una plataforma con
 * contenido de otras personas necesita una forma de decir «esto no debería
 * estar aquí» que no sea buscar el correo de alguien. Sin esto la aplicación no
 * pasa revisión, y sin esto tampoco es una plataforma decente.
 *
 * LA MITAD YA ESTABA CONSTRUIDA Y NADIE PODÍA USARLA. `content_reports` existe
 * desde `0009_graph_social_marketplace.sql` y `POST /api/report` desde entonces,
 * comprobando sesión y todo. **Lo que faltaba era el botón**: la tubería puesta
 * y la puerta sin poner. Comprobarlo antes costó dos minutos y ahorró escribir
 * una tabla y un endpoint que ya existían.
 *
 * POR QUÉ SE PIDE UN MOTIVO Y NO SE DENUNCIA DE UN TOQUE. Una denuncia sin
 * motivo obliga a quien la revise a adivinar qué vio la persona, y con volumen
 * eso significa que no se revisa ninguna. Los motivos de la lista son los que se
 * pueden juzgar mirando el contenido; «otra cosa» abre el campo libre para lo
 * que no habíamos previsto.
 *
 * Y NO SE OFRECE SOBRE LO PROPIO: denunciarte a ti mismo no es una acción, es
 * una confusión. Quien quiera quitar lo suyo tiene «Eliminar» ahí al lado.
 */

const MOTIVOS = [
  { id: 'spam', label: 'Spam o publicidad' },
  { id: 'odio', label: 'Odio o acoso hacia alguien' },
  { id: 'falso', label: 'Información falsa o engañosa' },
  { id: 'ilegal', label: 'Contenido ilegal' },
  { id: 'sexual', label: 'Contenido sexual o violento' },
  { id: 'otro', label: 'Otra cosa' },
];

export function Denunciar({
  tipo,
  id,
  titulo,
  onCerrar,
}: {
  /** `entity_type` que espera el servidor: publicacion, grafo, proyecto… */
  tipo: string;
  id: string;
  titulo?: string;
  onCerrar: () => void;
}) {
  const [motivo, setMotivo] = useState<string | null>(null);
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (!motivo) return;
    setEnviando(true);
    setError(null);
    try {
      const etiqueta = MOTIVOS.find(m => m.id === motivo)?.label || motivo;
      const r = await fetch('/api/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: tipo,
          entity_id: id,
          reason: detalle.trim() ? `${etiqueta} — ${detalle.trim()}` : etiqueta,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido enviar la denuncia.');
      setHecho(true);
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
            <Flag className="w-4 h-4 text-rose-600" /> Denunciar
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-2 -mr-2 min-h-[44px] text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {hecho ? (
          /*
           * QUÉ PASA DESPUÉS, DICHO. Una denuncia que responde «gracias» y nada
           * más enseña que denunciar no sirve, y a la tercera nadie denuncia.
           * Aquí se dice quién la lee y qué NO va a pasar — porque lo que la
           * gente espera al denunciar es que desaparezca al instante, y no es
           * así.
           */
          <div className="px-5 pb-6">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Gracias. Ya está enviada.</strong>
            </p>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              La lee una persona del equipo, no un programa. El contenido{' '}
              <strong className="text-slate-700">no desaparece automáticamente</strong>:
              se revisa primero, porque quitar algo por una sola denuncia sería
              regalarle a cualquiera el poder de borrar lo de otro.
            </p>
            <button
              onClick={onCerrar}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-bold"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5">
            {titulo && (
              <p className="text-xs text-slate-400 mb-3 truncate">Sobre «{titulo}»</p>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Qué pasa</p>
            <div className="space-y-1.5">
              {MOTIVOS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMotivo(m.id)}
                  className={cn(
                    'w-full min-h-[44px] px-3.5 rounded-xl border text-left text-sm font-medium transition-colors',
                    motivo === m.id
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-slate-200 text-slate-700 hover:border-rose-200',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <textarea
              value={detalle}
              onChange={e => setDetalle(e.target.value)}
              rows={2}
              placeholder="Cuéntanos algo más, si quieres"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/30"
            />

            {error && (
              <p className="mt-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              onClick={enviar}
              disabled={!motivo || enviando}
              className={cn(
                'mt-3 w-full min-h-[44px] rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors',
                motivo && !enviando ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed',
              )}
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar denuncia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
