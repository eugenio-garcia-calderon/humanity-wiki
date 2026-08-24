import { useEffect, useState } from 'react';
import { X, Loader2, Repeat2, Link2 } from 'lucide-react';
import Republicacion, { type Republicado } from './Republicacion';

/*
 * REPUBLICAR — el diálogo (2026-08-24)
 * ============================================================================
 * Dos caminos, y el mismo final:
 *
 *   · algo de la plataforma → llega ya elegido desde la tarjeta;
 *   · algo de fuera → se pega una dirección y **se ve antes de publicarla**.
 *
 * ── LA PREVIA NO ES UN LUJO ────────────────────────────────────────────────
 * Lo que se guarda de un enlace de fuera es una COPIA de lo que se leyó. Si
 * nadie la ve antes, se está repartiendo en el muro de todo el mundo un texto
 * que quien lo republica no ha leído — y cuando salga mal, con su nombre
 * encima. Así que la previa es el mismo bloque que verá la gente, no un
 * resumen distinto: lo que apruebas es exactamente lo que sale.
 *
 * ── EL COMENTARIO ES OPCIONAL, Y SE NOTA ───────────────────────────────────
 * Eugenio: «con o sin comentario». Sin él, republicar es repartir; con él, es
 * decir algo. El botón no cambia de nombre según haya texto o no: republicar
 * es la misma acción, y hacer que el botón baile enseña a dudar antes de
 * pulsarlo.
 */

export default function DialogoRepublicar({ original, onCerrar, onHecho }: {
  /** Lo que se republica, si viene ya elegido desde una tarjeta de aquí. */
  original?: { id: string; titulo?: string | null; autor?: string | null } | null;
  onCerrar: () => void;
  onHecho?: (id: string) => void;
}) {
  const [comentario, setComentario] = useState('');
  const [url, setUrl] = useState('');
  const [previa, setPrevia] = useState<Republicado | null>(null);
  const [mirando, setMirando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  async function mirarEnlace() {
    const v = url.trim();
    if (!v) return;
    setMirando(true); setError(null); setPrevia(null);
    try {
      const r = await fetch(`/api/republicar/previa?url=${encodeURIComponent(v)}`, { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'No se ha podido leer esa página.'); return; }
      setPrevia({ de: 'fuera', ...j.fuente });
    } catch {
      setError('No se ha podido leer esa página.');
    } finally {
      setMirando(false);
    }
  }

  async function republicar() {
    setEnviando(true); setError(null);
    try {
      const cuerpo: any = { comentario: comentario.trim() || null };
      if (original) cuerpo.pubId = original.id;
      else if (previa && previa.de === 'fuera') { cuerpo.url = previa.url; cuerpo.fuente = previa; }
      else { setError('Pega una dirección y pulsa Ver.'); setEnviando(false); return; }

      const r = await fetch('/api/republicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cuerpo),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'No se ha podido republicar.'); return; }
      onHecho?.(j.id);
      onCerrar();
    } catch {
      setError('No se ha podido republicar.');
    } finally {
      setEnviando(false);
    }
  }

  const listo = !!original || !!previa;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6">
      <div onClick={onCerrar} aria-hidden className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Republicar"
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Repeat2 className="h-4 w-4 shrink-0 text-slate-400" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">Republicar</h2>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {/* EL COMENTARIO VA ARRIBA porque es donde va a salir: lo que se
              escribe aquí se lee encima de lo republicado, igual que en la
              tarjeta. El diálogo tiene la misma forma que el resultado. */}
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            rows={3}
            placeholder="Di algo, si quieres. Puedes republicar sin comentario."
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-base outline-none placeholder:text-slate-400 focus:border-emerald-400 sm:text-sm"
          />

          {!original && (
            <div className="mt-3">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                De cualquier red o página
              </label>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 h-10 focus-within:border-emerald-400">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={url}
                    onChange={e => { setUrl(e.target.value); setPrevia(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); mirarEnlace(); } }}
                    placeholder="Pega aquí el enlace"
                    className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400 sm:text-sm"
                  />
                </div>
                <button
                  onClick={mirarEnlace}
                  disabled={!url.trim() || mirando}
                  className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
                >
                  {mirando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ver'}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                X, Instagram, YouTube, TikTok, un periódico… lo que tenga dirección.
              </p>
            </div>
          )}

          {/* LO QUE SE VA A REPUBLICAR, con la misma cara que tendrá después. */}
          <div className="mt-3">
            {original ? (
              <Republicacion r={{
                de: 'aqui', id: original.id,
                titulo: original.titulo, autor_nombre: original.autor,
              }} />
            ) : previa ? (
              <Republicacion r={previa} />
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                Aquí verás lo que vas a republicar antes de publicarlo.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button onClick={onCerrar} className="h-10 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={republicar}
            disabled={!listo || enviando}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
            Republicar
          </button>
        </div>
      </div>
    </div>
  );
}
