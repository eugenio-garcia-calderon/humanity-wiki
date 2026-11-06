// ============================================================================
// «CREAR NUEVO DISEÑO» (2026-11-05, Eugenio)
// ============================================================================
// «Un botón de crear nuevo diseño en cada una de las imágenes donde se conecte
// con Claude para, en base a lo que se escriba, crear un nuevo diseño sin
// necesidad de hablar a través del chat; que se quede cargando, diga el tiempo
// estimado y cuando esté listo aparezca un mensaje de diseño listo».
//
// Este cuadro solo APUNTA el encargo (`POST /api/calendario-arte/:anio/disenos`).
// Lo dibuja una tarea programada de Claude en la cuenta de Eugenio, que pasa
// por la cola cada cierto tiempo: por eso la hora es una estimación y se dice
// de dónde sale. Si el dibujante no ha pasado últimamente, se dice también.
import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/core';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import BotonMicrofono from '../ai/BotonMicrofono';
import { NOMBRES_MES, horaDe, type EncargoDiseno } from './HojaMes';

export interface EstadoRobot { ultima_pasada: string | null; intervalo_min: number; activo: boolean }

interface Props {
  anio: number;
  mes: number;
  tema: string;
  robot: EstadoRobot | null;
  alCerrar: () => void;
  alPedido: (e: EncargoDiseno & { robot?: EstadoRobot }) => void;
}

export function NuevoDiseno({ anio, mes, tema, robot, alCerrar, alPedido }: Props) {
  const [texto, setTexto] = useState('');
  const [trampa, setTrampa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const base = useRef('');
  const voz = useVoiceDictation((crudo, esFinal) => {
    const t = crudo.replace(/^\s+/, '');
    const sep = base.current && !base.current.endsWith(' ') ? ' ' : '';
    setTexto(base.current + sep + t);
    if (esFinal) base.current = base.current + sep + t;
  });

  useEffect(() => { campo.current?.focus(); }, []);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [alCerrar]);

  const pedir = async () => {
    if (texto.trim().length < 5) { setFallo('Describe un poco el diseño que quieres.'); return; }
    setEnviando(true); setFallo(null);
    try {
      const r = await fetch(`/api/calendario-arte/${anio}/disenos`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, prompt: texto.trim(), web: trampa }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se ha podido pedir el diseño.');
      alPedido(j);
    } catch (e: any) {
      setFallo(e.message);
      setEnviando(false);
    }
  };

  const cada = robot?.intervalo_min ?? 60;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onMouseDown={e => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-stone-800">Crear nuevo diseño</h2>
            <p className="text-sm text-stone-500">{NOMBRES_MES[mes - 1]} · {tema}</p>
          </div>
          <Button variant="ghost" className="px-2" onClick={alCerrar} aria-label="Cerrar"><X className="h-5 w-5" /></Button>
        </div>
        <label className="block text-sm font-semibold text-stone-700" htmlFor="ca-nuevo-diseno">¿Cómo te lo imaginas?</label>
        <div className="relative mt-1">
          <textarea
            id="ca-nuevo-diseno"
            ref={campo}
            value={texto}
            onChange={e => { setTexto(e.target.value); base.current = e.target.value; }}
            rows={5}
            maxLength={2000}
            placeholder="Por ejemplo: una sola figura grande, la luz en un amanecer de mar y la sombra en una ciudad sin árboles; menos elementos, colores más cálidos…"
            className="w-full resize-none rounded-xl border border-stone-300 p-3 pr-12 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
          {voz.supported && (
            <div className="absolute bottom-2 right-2">
              <BotonMicrofono escuchando={voz.listening} nivel={voz.nivel} error={voz.error}
                onPulsar={() => { if (!voz.listening) base.current = texto; voz.toggle(); }}
                microfonos={voz.microfonos} microfono={voz.microfono} onElegir={voz.setMicrofono} onAbrirLista={voz.cargarMicrofonos} />
            </div>
          )}
        </div>
        {/* Campo trampa: invisible para las personas. */}
        <input type="text" tabIndex={-1} autoComplete="off" value={trampa} onChange={e => setTrampa(e.target.value)} className="hidden" aria-hidden name="web" />
        <p className="mt-2 text-xs leading-relaxed text-stone-500">
          Lo dibuja Claude por su cuenta, sin chat, con el estilo del calendario. Pasa a mirar los encargos cada {cada} minutos y tarda unos 20 en cada diseño.
          {robot?.activo && robot.ultima_pasada
            ? ` Pasó por última vez a las ${new Date(robot.ultima_pasada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`
            : ' Ahora mismo el dibujante automático no ha pasado últimamente: el encargo queda guardado y se dibujará cuando vuelva.'}
          {' '}Cuando esté listo te avisaremos aquí y aparecerá como un diseño más.
        </p>
        {fallo && <p className="mt-2 text-sm text-rose-600">{fallo}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={alCerrar}>Cancelar</Button>
          <Button onClick={pedir} disabled={enviando} className="gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Pedir el diseño
          </Button>
        </div>
      </div>
    </div>
  );
}

/** El aviso de abajo a la derecha: «Diseño listo · Ver». */
export function AvisoDisenoListo({ mes, n, alVer, alCerrar }: { mes: number; n: number; alVer: () => void; alCerrar: () => void }) {
  return (
    <div role="status" className="ca-no-imprimir fixed bottom-20 right-4 z-40 flex items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-white shadow-2xl">
      <Sparkles className="h-5 w-5 shrink-0 text-amber-400" />
      <span className="text-sm"><b>Diseño listo</b> · {NOMBRES_MES[mes - 1]}, diseño {n}</span>
      <Button onClick={alVer} className="px-3 py-1.5 text-xs">Ver</Button>
      <Button variant="ghost" onClick={alCerrar} className="px-1.5 text-white hover:bg-white/10" aria-label="Cerrar"><X className="h-4 w-4" /></Button>
    </div>
  );
}

export { horaDe };
