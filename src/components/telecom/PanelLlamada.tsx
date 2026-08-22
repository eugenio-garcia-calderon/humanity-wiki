import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, PhoneOff,
  Maximize2, Minimize2, Loader2, ScreenShare,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTelecom } from '../../telecom/useTelecom';
import { alternarCamara, alternarMicro, alternarPantalla, colgar } from '../../telecom/motor';
import { BotonRedondo, Cara, reloj } from './piezas';

// ============================================================================
// LA LLAMADA EN CURSO (2026-08-22)
// ============================================================================
// UNA VENTANA FLOTANTE Y NO UNA PÁGINA, y esa es la decisión que manda sobre
// todo lo demás. Una llamada no es un sitio al que se va: es algo que pasa
// MIENTRAS haces otra cosa. Si esto fuera una página, atender una llamada te
// echaría de la tabla que estabas mirando y volver sería un botón «atrás» que
// cuelga. Así se queda encima, se hace pequeña, y la aplicación sigue debajo.
//
// SE PUEDE AGRANDAR porque una videollamada de tres personas en un rectángulo
// de 320 píxeles no sirve para nada, y compartir pantalla en ese tamaño es una
// broma: el código de una pantalla compartida no se lee ni de lejos.

export default function PanelLlamada() {
  const { llamada, streamLocal, streamRemoto } = useTelecom();
  const [grande, setGrande] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const videoRemoto = useRef<HTMLVideoElement>(null);
  const audioRemoto = useRef<HTMLAudioElement>(null);
  const videoLocal = useRef<HTMLVideoElement>(null);

  // EL AUDIO VA EN SU PROPIO ELEMENTO Y EL VÍDEO VA MUDO. Si el `<video>`
  // llevara el sonido, al esconderlo —una llamada de voz no pinta vídeo— el
  // navegador podría dejar de reproducirlo y la llamada se quedaría muda sin
  // que nada pareciera roto.
  useEffect(() => {
    if (audioRemoto.current && audioRemoto.current.srcObject !== streamRemoto) {
      audioRemoto.current.srcObject = streamRemoto;
      audioRemoto.current.play?.().catch(() => {});
    }
    if (videoRemoto.current && videoRemoto.current.srcObject !== streamRemoto) {
      videoRemoto.current.srcObject = streamRemoto;
    }
  }, [streamRemoto]);

  useEffect(() => {
    if (videoLocal.current && videoLocal.current.srcObject !== streamLocal) {
      videoLocal.current.srcObject = streamLocal;
    }
  }, [streamLocal, llamada?.camara, llamada?.pantalla]);

  // El cronómetro solo late mientras se habla: un temporizador corriendo con la
  // llamada colgada es una pestaña gastando batería para nada.
  const hablando = llamada?.fase === 'hablando' || llamada?.fase === 'conectando';
  useEffect(() => {
    if (!hablando) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hablando]);

  // Una videollamada se abre grande sola; una de voz, pequeña.
  useEffect(() => { if (llamada?.tipo === 'video') setGrande(true); }, [llamada?.id]);

  if (!llamada || (llamada.entrante && llamada.fase === 'sonando')) return null;

  const seVe = llamada.hayVideoRemoto || llamada.camara || llamada.pantalla;
  const segundos = llamada.desde && llamada.fase === 'hablando' ? (ahora - llamada.desde) / 1000 : 0;

  const pie =
    llamada.fase === 'llamando' ? 'Llamando…'
    : llamada.fase === 'conectando' ? 'Conectando…'
    : reloj(segundos);

  return (
    <div
      role="dialog"
      aria-label={`Llamada con ${llamada.con.nombre}`}
      className={cn(
        'fixed z-[60] rounded-2xl overflow-hidden bg-slate-900 text-white shadow-2xl ring-1 ring-slate-800',
        'animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col',
        grande
          ? 'inset-2 sm:inset-6 lg:inset-10'
          : 'right-3 bottom-3 w-[19rem] sm:w-80',
      )}
    >
      {/* LO QUE SE VE DEL OTRO LADO */}
      <div className={cn('relative bg-slate-950 flex-1', grande ? 'min-h-0' : 'h-44')}>
        <video
          ref={videoRemoto}
          autoPlay playsInline muted
          className={cn('w-full h-full', seVe ? 'block' : 'hidden',
            // UNA PANTALLA COMPARTIDA NO SE RECORTA NUNCA. `cover` llenaría el
            // hueco cortando los bordes, y en una pantalla compartida los
            // bordes son la barra de herramientas y la mitad del texto.
            llamada.hayVideoRemoto ? 'object-contain' : 'object-cover')}
        />
        {!seVe && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <Cara nombre={llamada.con.nombre} avatar={llamada.con.avatar} tam={grande ? 'lg' : 'md'} />
              <p className="mt-3 text-sm font-black">{llamada.con.nombre}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                {llamada.fase !== 'hablando' && <Loader2 className="w-3 h-3 animate-spin" />}
                {pie}
              </p>
            </div>
          </div>
        )}

        {/* Lo mío, en pequeño. Espejado: verse al revés desconcierta, porque
            nadie se ha visto nunca sin espejo. La pantalla compartida NO se
            espeja — el texto saldría al revés. */}
        {(llamada.camara || llamada.pantalla) && (
          <video
            ref={videoLocal}
            autoPlay playsInline muted
            className={cn('absolute rounded-lg object-cover ring-1 ring-white/20 bg-slate-800',
              grande ? 'w-40 h-28 right-3 bottom-3' : 'w-20 h-14 right-2 bottom-2',
              !llamada.pantalla && 'scale-x-[-1]')}
          />
        )}

        {/* La barra de arriba: con quién, cuánto y el botón de agrandar. */}
        <div className="absolute inset-x-0 top-0 p-2 flex items-center gap-2 bg-gradient-to-b from-slate-950/80 to-transparent">
          {seVe && (
            <>
              <Cara nombre={llamada.con.nombre} avatar={llamada.con.avatar} tam="sm" />
              <span className="min-w-0">
                <span className="block text-xs font-black truncate">{llamada.con.nombre}</span>
                <span className="block text-[10px] text-slate-300">{pie}</span>
              </span>
            </>
          )}
          {llamada.pantalla && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-[10px] font-black">
              <ScreenShare className="w-3 h-3" /> Compartiendo
            </span>
          )}
          <button
            type="button"
            onClick={() => setGrande(g => !g)}
            title={grande ? 'Hacer pequeña' : 'Agrandar'}
            aria-label={grande ? 'Hacer pequeña' : 'Agrandar'}
            className="ml-auto w-7 h-7 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {grande ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {llamada.aviso && (
          <p className="absolute inset-x-3 bottom-3 px-3 py-2 rounded-xl bg-amber-500/90 text-slate-900 text-[11px] font-bold text-center">
            {llamada.aviso}
          </p>
        )}
      </div>

      {/* LOS MANDOS */}
      <div className="p-3 flex items-center justify-center gap-2 bg-slate-900 shrink-0">
        <BotonRedondo
          icono={llamada.micro ? Mic : MicOff}
          etiqueta={llamada.micro ? 'Silenciar el micrófono' : 'Volver a hablar'}
          tono={llamada.micro ? 'neutro' : 'apagado'}
          activo={!llamada.micro}
          onClick={alternarMicro}
        />
        <BotonRedondo
          icono={llamada.camara ? Video : VideoOff}
          etiqueta={llamada.camara ? 'Apagar la cámara' : 'Encender la cámara'}
          tono={llamada.camara ? 'neutro' : 'apagado'}
          activo={llamada.camara}
          onClick={() => { alternarCamara(); }}
        />
        {/* COMPARTIR PANTALLA NO EXISTE EN EL MÓVIL, y no se enseña un botón
            que no puede funcionar: ni iOS ni Android dejan que una página
            capture la pantalla. */}
        {typeof (navigator.mediaDevices as any)?.getDisplayMedia === 'function' && (
          <BotonRedondo
            icono={llamada.pantalla ? MonitorX : MonitorUp}
            etiqueta={llamada.pantalla ? 'Dejar de compartir la pantalla' : 'Compartir mi pantalla'}
            tono="neutro"
            activo={llamada.pantalla}
            onClick={() => { alternarPantalla(); }}
          />
        )}
        <BotonRedondo icono={PhoneOff} etiqueta="Colgar" tono="colgar" grande onClick={() => { colgar(); }} />
      </div>

      <audio ref={audioRemoto} autoPlay playsInline className="hidden" />
    </div>
  );
}
