import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Loader2, MessageSquareHeart, Send, X } from 'lucide-react';

// ============================================================================
// ¿QUÉ MEJORARÍAS? — EL BOTÓN DE OPINIÓN DE LOS SITIOS (2026-10-28, Eugenio)
// ============================================================================
// «Recupera el botón de feedback flotante para que la gente ponga comentarios de
// mejora; ponlo abajo, centrado y grande, con una opción de texto rápido y enviar
// sin necesidad de entrar en otra página.» En la plataforma, el botón de feedback
// lleva al Hormiguero (`Layout.tsx`); en un sitio, quien opina no tiene cuenta ni
// tiene por qué salir de la página: el botón se despliega en una caja de texto ahí
// mismo y envía a `/api/sitio/opinion` (entra como propuesta en el Hormiguero, con
// la página desde la que se escribió).

export default function BotonOpinion() {
  const { pathname, search } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [trampa, setTrampa] = useState('');
  const [estado, setEstado] = useState<'escribiendo' | 'enviando' | 'hecho'>('escribiendo');
  const [fallo, setFallo] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => { if (abierto) campo.current?.focus(); }, [abierto]);
  // Escape o un clic fuera la cierran (lo escrito se queda por si se vuelve a abrir).
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('keydown', tecla); document.addEventListener('mousedown', fuera);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fuera); };
  }, [abierto]);

  const enviar = async () => {
    const t = texto.trim();
    if (t.length < 3) { setFallo('Escribe un poco más.'); return; }
    setFallo(null); setEstado('enviando');
    try {
      const r = await fetch('/api/sitio/opinion', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: t, pagina: `${pathname}${search}`, web: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido enviar. Prueba otra vez.');
      setEstado('hecho'); setTexto('');
      window.setTimeout(() => { setAbierto(false); setEstado('escribiendo'); }, 2600);
    } catch (e: any) {
      setFallo(e.message); setEstado('escribiendo');
    }
  };

  return (
    <div ref={caja} data-boton-opinion className="pointer-events-none fixed inset-x-0 z-[9990] flex justify-center px-4"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
      {abierto ? (
        <div role="dialog" aria-label="¿Qué mejorarías?" className="pointer-events-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35)]">
          {estado === 'hecho' ? (
            <p className="flex items-center justify-center gap-2 py-6 text-base font-bold text-emerald-700" data-opinion-hecha>
              <Check className="h-5 w-5" /> ¡Gracias! La leeremos para mejorar.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-base font-black text-slate-900">¿Qué mejorarías?</p>
                <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-4 w-4" /></button>
              </div>
              <textarea ref={campo} value={texto} onChange={e => setTexto(e.target.value)} rows={3} maxLength={4000}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar(); }}
                placeholder="Cuéntanos qué falla, qué falta o qué te gustaría ver aquí…"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" />
              {/* Campo trampa: invisible para las personas; los robots lo rellenan y su envío se descarta. */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={trampa} onChange={e => setTrampa(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">{fallo ? <span className="font-semibold text-red-600">{fallo}</span> : 'Sin cuenta y sin salir de la página.'}</p>
                <button type="button" onClick={enviar} disabled={estado === 'enviando' || texto.trim().length < 3} data-enviar-opinion
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-40">
                  {estado === 'enviando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} data-abrir-opinion
          className="pointer-events-auto inline-flex h-14 items-center gap-2.5 rounded-full bg-amber-400 px-7 text-base font-black text-slate-900 shadow-[0_12px_30px_-8px_rgba(217,119,6,0.55)] ring-4 ring-white transition hover:-translate-y-0.5 hover:bg-amber-300">
          <MessageSquareHeart className="h-6 w-6" /> ¿Qué mejorarías?
        </button>
      )}
    </div>
  );
}
