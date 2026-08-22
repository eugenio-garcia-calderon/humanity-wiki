import { Phone, PhoneOff, Video } from 'lucide-react';
import { useTelecom } from '../../telecom/useTelecom';
import { contestar, colgar } from '../../telecom/motor';
import { BotonRedondo, Cara } from './piezas';

// ============================================================================
// EL TELÉFONO SONANDO (2026-08-22)
// ============================================================================
// Eugenio: «…y le saltará en su aplicación». Esto es ese salto.
//
// TAPA LA PANTALLA ENTERA A PROPÓSITO, y es lo único de toda la plataforma que
// se permite hacerlo. Un aviso discreto en una esquina es lo correcto para un
// mensaje y lo equivocado para una llamada: una llamada dura veinte segundos y
// si no la ves, no existe. Es el mismo motivo por el que el teléfono de casa
// sonaba en el pasillo y no dentro de un cajón.
//
// LO QUE NO HACE: no contesta sola, no enciende la cámara antes de que
// descuelgues y no enseña tu imagen a nadie hasta entonces. El permiso del
// micrófono se pide AL DESCOLGAR, no al sonar.

export default function LlamadaEntrante() {
  const { llamada } = useTelecom();
  if (!llamada || !llamada.entrante || llamada.fase !== 'sonando') return null;

  const esVideo = llamada.tipo === 'video';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${llamada.con.nombre} te llama`}
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-[min(22rem,92vw)] rounded-3xl bg-white shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wide">
          {esVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
          {esVideo ? 'Videollamada' : 'Llamada'}
        </span>

        <div className="mt-4 flex justify-center">
          {/* El aro que late. Es la única animación de la pantalla: si todo se
              moviera, no llamaría la atención nada. */}
          <span className="relative">
            <span className="absolute -inset-2 rounded-full bg-emerald-400/30 animate-ping" />
            <Cara nombre={llamada.con.nombre} avatar={llamada.con.avatar} tam="lg" />
          </span>
        </div>

        <p className="mt-4 text-lg font-black text-slate-900">{llamada.con.nombre}</p>
        <p className="text-xs text-slate-400">te está llamando</p>

        <div className="mt-6 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-1.5">
            <BotonRedondo icono={PhoneOff} etiqueta="Rechazar la llamada" tono="colgar" grande onClick={() => { colgar(); }} />
            <span className="text-[10px] font-bold text-slate-400">Rechazar</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <BotonRedondo
              icono={esVideo ? Video : Phone}
              etiqueta="Descolgar"
              tono="contestar"
              grande
              onClick={() => { contestar(); }}
            />
            <span className="text-[10px] font-bold text-slate-400">Descolgar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
