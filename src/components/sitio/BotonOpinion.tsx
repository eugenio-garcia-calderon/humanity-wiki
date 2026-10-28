import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ImagePlus, Loader2, MessageSquareHeart, Send, X } from 'lucide-react';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import BotonMicrofono from '../ai/BotonMicrofono';

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
//
// Segunda vuelta (el mismo día: «permite también añadir imágenes, quita el mensaje
// de "Sin cuenta…", el cuadro de texto más grande, que se pueda usar el dictado por
// voz que ya tenemos, y el botón de enviar a la derecha»): hasta tres imágenes
// (reducidas aquí antes de enviarlas), el micrófono del chat de IA
// (`useVoiceDictation`, que sin sesión usa el reconocimiento del navegador) y
// «Enviar» a la derecha del cuadro.

const MAX_IMAGENES = 3;

/** Reduce una imagen a 1.600 px de lado como mucho y la devuelve como JPEG en `data:`. */
function reducir(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const lado = 1600, escala = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
      const g = c.getContext('2d');
      if (!g) { URL.revokeObjectURL(url); mal(new Error('sin lienzo')); return; }
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('no es una imagen')); };
    img.src = url;
  });
}

export default function BotonOpinion() {
  const { pathname, search } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [trampa, setTrampa] = useState('');
  const [estado, setEstado] = useState<'escribiendo' | 'enviando' | 'hecho'>('escribiendo');
  const [fallo, setFallo] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const selector = useRef<HTMLInputElement>(null);

  // El dictado escribe detrás de lo que ya había (como en la caja del Hormiguero).
  const base = useRef('');
  const voz = useVoiceDictation((crudo, esFinal) => {
    const t = crudo.replace(/^\s+/, '');
    const sep = base.current && !base.current.endsWith(' ') ? ' ' : '';
    setTexto(base.current + sep + t);
    if (esFinal) base.current = base.current + sep + t;
  });

  useEffect(() => { if (abierto) campo.current?.focus(); }, [abierto]);
  // Escape o un clic fuera la cierran (lo escrito se queda por si se vuelve a abrir).
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('keydown', tecla); document.addEventListener('mousedown', fuera);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fuera); };
  }, [abierto]);

  const anadir = async (archivos: FileList | File[] | null) => {
    const lista = [...(archivos || [])].filter(f => f.type.startsWith('image/')).slice(0, MAX_IMAGENES - imagenes.length);
    if (!lista.length) return;
    try { const nuevas = await Promise.all(lista.map(reducir)); setImagenes(v => [...v, ...nuevas].slice(0, MAX_IMAGENES)); setFallo(null); }
    catch { setFallo('Esa imagen no se ha podido leer.'); }
  };

  const enviar = async () => {
    const t = texto.trim();
    if (t.length < 3 && !imagenes.length) { setFallo('Escribe un poco más.'); return; }
    if (voz.listening) voz.toggle();
    setFallo(null); setEstado('enviando');
    try {
      const r = await fetch('/api/sitio/opinion', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: t, imagenes, pagina: `${pathname}${search}`, web: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido enviar. Prueba otra vez.');
      setEstado('hecho'); setTexto(''); setImagenes([]); base.current = '';
      window.setTimeout(() => { setAbierto(false); setEstado('escribiendo'); }, 2600);
    } catch (e: any) {
      setFallo(e.message); setEstado('escribiendo');
    }
  };

  const listo = texto.trim().length >= 3 || imagenes.length > 0;
  return (
    <div ref={caja} data-boton-opinion className="pointer-events-none fixed inset-x-0 z-[9990] flex justify-center px-4"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
      {abierto ? (
        <div role="dialog" aria-label="¿Qué mejorarías?" className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35)]"
          onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); anadir(e.dataTransfer.files); }}>
          {estado === 'hecho' ? (
            <p className="flex items-center justify-center gap-2 py-8 text-base font-bold text-emerald-700" data-opinion-hecha>
              <Check className="h-5 w-5" /> ¡Gracias! La leeremos para mejorar.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-base font-black text-slate-900">¿Qué mejorarías?</p>
                <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex items-stretch gap-2">
                {/* El cuadro, con el micrófono y el botón de imágenes dentro, abajo a la derecha. */}
                <div className="relative min-w-0 flex-1">
                  <textarea ref={campo} value={texto} onChange={e => { setTexto(e.target.value); base.current = e.target.value; }} rows={5} maxLength={4000}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar(); }}
                    onPaste={e => { const f = [...e.clipboardData.files].filter(x => x.type.startsWith('image/')); if (f.length) { e.preventDefault(); anadir(f); } }}
                    placeholder="Cuéntanos qué falla, qué falta o qué te gustaría ver aquí… También puedes dictarlo o añadir imágenes."
                    className="block h-full min-h-[136px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 pb-12 pt-3 text-[15px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <button type="button" onClick={() => selector.current?.click()} disabled={imagenes.length >= MAX_IMAGENES} title="Añadir imágenes" aria-label="Añadir imágenes" data-imagen-opinion
                      className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40">
                      <ImagePlus className="h-5 w-5" />
                    </button>
                    {voz.supported && (
                      <BotonMicrofono escuchando={voz.listening} nivel={voz.nivel} error={voz.error}
                        onPulsar={() => { if (!voz.listening) base.current = texto; voz.toggle(); }}
                        microfonos={voz.microfonos} microfono={voz.microfono} onElegir={voz.setMicrofono} onAbrirLista={voz.cargarMicrofonos} />
                    )}
                  </div>
                  <input ref={selector} type="file" accept="image/*" multiple hidden onChange={e => { anadir(e.target.files); e.target.value = ''; }} />
                </div>
                <button type="button" onClick={enviar} disabled={estado === 'enviando' || !listo} data-enviar-opinion title="Enviar"
                  className="inline-flex w-[92px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-900 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-40">
                  {estado === 'enviando' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Enviar
                </button>
              </div>
              {imagenes.length > 0 && (
                <div className="mt-2 flex gap-2" data-imagenes-opinion>
                  {imagenes.map((src, i) => (
                    <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setImagenes(v => v.filter((_, k) => k !== i))} aria-label="Quitar la imagen"
                        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900/80 text-white"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {fallo && <p className="mt-2 text-xs font-semibold text-red-600">{fallo}</p>}
              {/* Campo trampa: invisible para las personas; los robots lo rellenan y su envío se descarta. */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={trampa} onChange={e => setTrampa(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
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
