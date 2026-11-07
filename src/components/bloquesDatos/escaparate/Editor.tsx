import { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import type { PropsEditor } from '../tipos';
import Lectura from './Lectura';
import { seccionDe, SECCIONES_ESCAPARATE, FORMAS_COLABORAR } from '../../sitio/reglasPaginasEscaparate';

// Una sección del escaparate en el editor: su nombre, qué es y cómo se verá. No se escribe
// dentro (se rellena sola con los datos del sitio); se mueve o se quita como cualquier bloque.
// Las tarjetas de «Formas de colaborar» sí dejan cambiar su título y su texto (`datos.textos`).
export default function Editor(props: PropsEditor) {
  const { datos, editable, cambiarDatos } = props;
  const seccion = seccionDe({ tipo: 'escaparate', datos });
  const [abierto, setAbierto] = useState(false);
  const textos = (datos.textos && typeof datos.textos === 'object' ? datos.textos : {}) as Record<string, { titulo?: string; texto?: string }>;
  const poner = (motivo: string, campo: 'titulo' | 'texto', valor: string) =>
    cambiarDatos({ textos: { ...textos, [motivo]: { ...(textos[motivo] || {}), [campo]: valor } } });
  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-3 sm:p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-800">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Sección automática · {seccion ? SECCIONES_ESCAPARATE[seccion] : 'desconocida'}
      </p>
      <p className="mt-1 text-xs leading-snug text-slate-600">
        Se rellena sola con los datos del sitio y se pone al día sin tocarla. Puedes moverla o quitarla; el texto de alrededor se escribe como siempre.
      </p>
      {seccion === 'formas' && editable && (
        <div className="mt-3">
          <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 hover:border-amber-500">
            Cambiar los textos de las tarjetas <ChevronDown className={`h-3.5 w-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {abierto && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {FORMAS_COLABORAR.map(f => (
                <fieldset key={f.motivo} className="rounded-xl border border-slate-200 bg-white p-3">
                  <legend className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-500">{f.titulo}</legend>
                  <label className="block text-xs font-bold text-slate-700">
                    Título
                    <input value={textos[f.motivo]?.titulo ?? ''} placeholder={f.titulo} maxLength={60}
                      onChange={e => poner(f.motivo, 'titulo', e.target.value)}
                      className="mt-1 block h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm font-normal outline-none focus:border-slate-900" />
                  </label>
                  <label className="mt-2 block text-xs font-bold text-slate-700">
                    Texto
                    <textarea value={textos[f.motivo]?.texto ?? ''} placeholder={f.texto} maxLength={280} rows={3}
                      onChange={e => poner(f.motivo, 'texto', e.target.value)}
                      className="mt-1 block w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-normal outline-none focus:border-slate-900" />
                  </label>
                </fieldset>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Cómo se verá: sin poder pulsar nada (sus enlaces son los del sitio publicado). */}
      <div className="pointer-events-none mt-4 select-none">
        <Lectura {...props} />
      </div>
    </div>
  );
}
