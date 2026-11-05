// ============================================================================
// «AÑADIR PROPUESTA DE MEJORA» — abajo y centrado (2026-11-05, Eugenio)
// ============================================================================
// El mismo gesto que el «¿Qué mejorarías?» de los sitios (`sitio/BotonOpinion`):
// se despliega ahí mismo, se escribe o se dicta por voz, se pueden añadir hasta
// tres imágenes, y se envía sin cuenta. Lo enviado entra en «Tareas de mejora»
// del calendario (`calendario_arte_ideas`), que es la lista que lee la IA.
// Sabe en qué mes estás y lo anota con la propuesta.
import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Lightbulb, Loader2, Send, X } from 'lucide-react';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import BotonMicrofono from '../ai/BotonMicrofono';
import { subirImagenCalendario } from './subirImagen';
import { NOMBRES_MES } from './HojaMes';

const MAX_IMAGENES = 3;

export function BotonPropuesta({ anio, mes, alEnviada }: { anio: number; mes: number | null; alEnviada?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [imagenes, setImagenes] = useState<{ url: string; vista: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [trampa, setTrampa] = useState('');
  const [estado, setEstado] = useState<'escribiendo' | 'enviando' | 'hecho'>('escribiendo');
  const [fallo, setFallo] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const selector = useRef<HTMLInputElement>(null);

  // El dictado escribe detrás de lo que ya había.
  const base = useRef('');
  const voz = useVoiceDictation((crudo, esFinal) => {
    const t = crudo.replace(/^\s+/, '');
    const sep = base.current && !base.current.endsWith(' ') ? ' ' : '';
    setTexto(base.current + sep + t);
    if (esFinal) base.current = base.current + sep + t;
  });

  useEffect(() => { if (abierto) campo.current?.focus(); }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('keydown', tecla); document.addEventListener('mousedown', fuera);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fuera); };
  }, [abierto]);

  const anadir = async (archivos: FileList | File[] | null) => {
    const lista = [...(archivos || [])].filter(f => f.type.startsWith('image/') || /\.hei[cf]$/i.test(f.name)).slice(0, MAX_IMAGENES - imagenes.length);
    if (!lista.length) return;
    setSubiendo(true); setFallo(null);
    for (const f of lista) {
      const r = await subirImagenCalendario(f);
      if ('error' in r) { setFallo(r.error); continue; }
      setImagenes(v => [...v, { url: r.url, vista: r.url }].slice(0, MAX_IMAGENES));
    }
    setSubiendo(false);
  };

  const enviar = async () => {
    const t = texto.trim();
    if (t.length < 3 && !imagenes.length) { setFallo('Escribe un poco más.'); return; }
    if (voz.listening) voz.toggle();
    setFallo(null); setEstado('enviando');
    try {
      const r = await fetch(`/api/calendario-arte/${anio}/ideas`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: t, mes: mes || null, imagenes: imagenes.map(i => i.url), web: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido enviar. Prueba otra vez.');
      setEstado('hecho'); setTexto(''); setImagenes([]); base.current = '';
      alEnviada?.();
      window.setTimeout(() => { setAbierto(false); setEstado('escribiendo'); }, 2400);
    } catch (e: any) {
      setFallo(e.message); setEstado('escribiendo');
    }
  };

  const listo = texto.trim().length >= 3 || imagenes.length > 0;
  return (
    <div ref={caja} className="ca-no-imprimir pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
      {abierto ? (
        <div role="dialog" aria-label="Añadir propuesta de mejora" className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35)]"
          onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); anadir(e.dataTransfer.files); }}>
          {estado === 'hecho' ? (
            <p className="flex items-center justify-center gap-2 py-8 text-base font-bold text-emerald-700">
              <Check className="h-5 w-5" /> ¡Gracias! Está en «Tareas de mejora».
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-base font-bold text-stone-900">
                  Añadir propuesta de mejora{mes ? <span className="font-normal text-stone-400"> · {NOMBRES_MES[mes - 1]}</span> : null}
                </p>
                <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex items-stretch gap-2">
                <div className="relative min-w-0 flex-1">
                  <textarea ref={campo} value={texto} onChange={e => { setTexto(e.target.value); base.current = e.target.value; }} rows={5} maxLength={4000}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar(); }}
                    onPaste={e => { const f = [...e.clipboardData.files].filter(x => x.type.startsWith('image/')); if (f.length) { e.preventDefault(); anadir(f); } }}
                    placeholder="¿Qué cambiarías? Una frase de un día, la ilustración, un juego, el diseño… Puedes dictarlo o añadir imágenes."
                    className="block h-full min-h-[136px] w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-3.5 pb-12 pt-3 text-[15px] leading-relaxed text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200" />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <button type="button" onClick={() => selector.current?.click()} disabled={imagenes.length >= MAX_IMAGENES || subiendo} title="Añadir imágenes" aria-label="Añadir imágenes"
                      className="grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-900 disabled:opacity-40">
                      {subiendo ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    </button>
                    {voz.supported && (
                      <BotonMicrofono escuchando={voz.listening} nivel={voz.nivel} error={voz.error}
                        onPulsar={() => { if (!voz.listening) base.current = texto; voz.toggle(); }}
                        microfonos={voz.microfonos} microfono={voz.microfono} onElegir={voz.setMicrofono} onAbrirLista={voz.cargarMicrofonos} />
                    )}
                  </div>
                  <input ref={selector} type="file" accept="image/*" multiple hidden onChange={e => { anadir(e.target.files); e.target.value = ''; }} />
                </div>
                <button type="button" onClick={enviar} disabled={estado === 'enviando' || subiendo || !listo} title="Enviar"
                  className="inline-flex w-[92px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-stone-900 text-sm font-bold text-white transition-colors hover:bg-stone-700 disabled:opacity-40">
                  {estado === 'enviando' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Enviar
                </button>
              </div>
              {imagenes.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {imagenes.map((im, i) => (
                    <div key={im.url} className="relative h-16 w-16 overflow-hidden rounded-xl border border-stone-200">
                      <img src={im.vista} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setImagenes(v => v.filter((_, k) => k !== i))} aria-label="Quitar la imagen"
                        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-stone-900/80 text-white"><X className="h-3 w-3" /></button>
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
        <button type="button" onClick={() => setAbierto(true)}
          className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-amber-400 px-5 text-sm font-bold text-stone-900 shadow-[0_10px_24px_-8px_rgba(217,119,6,0.5)] ring-2 ring-white transition hover:-translate-y-0.5 hover:bg-amber-300">
          <Lightbulb className="h-[18px] w-[18px]" /> Añadir propuesta de mejora
        </button>
      )}
    </div>
  );
}
