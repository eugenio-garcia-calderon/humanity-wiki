import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, PhoneOff,
  Maximize2, Minimize2, Loader2, ScreenShare, Expand, Shrink,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTelecom } from '../../telecom/useTelecom';
import { alternarCamara, alternarMicro, alternarPantalla, colgar } from '../../telecom/motor';
import { leerPreferencias, sonarPor } from '../../telecom/aparatos';
import { BotonRedondo, Cara, Cobertura, Aviso, reloj } from './piezas';
import MenuAparatos from './MenuAparatos';

// ============================================================================
// LA LLAMADA EN CURSO (2026-08-22)
// ============================================================================
// UNA VENTANA FLOTANTE Y NO UNA PÁGINA, y esa es la decisión que manda sobre
// todo lo demás. Una llamada no es un sitio al que se va: es algo que pasa
// MIENTRAS haces otra cosa. Si esto fuera una página, atender una llamada te
// echaría de la tabla que estabas mirando y volver sería un botón «atrás» que
// cuelga. Así se queda encima, se hace pequeña, y la aplicación sigue debajo.
//
// ── TRES TAMAÑOS, NO DOS (2026-08-23) ───────────────────────────────────────
//   pequeña   un rectángulo en una esquina, y la aplicación entera usable
//   grande    ocupa casi todo, con márgenes: sigues viendo dónde estás
//   completa  la pantalla completa DE VERDAD, la del navegador
//
// La tercera no es un capricho. «Grande» deja márgenes, la barra del navegador
// y la del sistema: en un portátil de 13 pulgadas eso se come un tercio del
// alto, y compartir pantalla ahí es enseñar código que no se puede leer.
// Compartir una pantalla dentro de una ventana pequeña es una broma; era la
// función estrella y estaba servida en el peor sitio posible.
//
// ── LO QUE LA LLAMADA CUENTA AHORA, Y ANTES NO ──────────────────────────────
// Antes de esto, una llamada perfecta y una que perdía uno de cada cinco
// paquetes se veían exactamente igual. La aplicación lo sabía y no lo decía, y
// eso convierte un problema de red en una discusión entre dos personas
// («¿me oyes?» «sí, ¿y tú?»). Ahora se ve la cobertura, se avisa cuando va mal,
// se avisa mientras se recupera sola, se ve quién está hablando —que en una
// llamada de voz es la única señal de que la llamada sigue viva— y, sobre todo,
// se avisa de que **estás hablando con el micrófono cerrado**.

export default function PanelLlamada() {
  const { llamada, streamLocal, streamRemoto } = useTelecom();
  const [grande, setGrande] = useState(false);
  const [completa, setCompleta] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const caja = useRef<HTMLDivElement>(null);
  const videoRemoto = useRef<HTMLVideoElement>(null);
  const audioRemoto = useRef<HTMLAudioElement>(null);
  const videoLocal = useRef<HTMLVideoElement>(null);
  const [audioListo, setAudioListo] = useState<HTMLAudioElement | null>(null);

  // EL AUDIO VA EN SU PROPIO ELEMENTO Y EL VÍDEO VA MUDO. Si el `<video>`
  // llevara el sonido, al esconderlo —una llamada de voz no pinta vídeo— el
  // navegador podría dejar de reproducirlo y la llamada se quedaría muda sin
  // que nada pareciera roto.
  useEffect(() => {
    if (audioRemoto.current && audioRemoto.current.srcObject !== streamRemoto) {
      audioRemoto.current.srcObject = streamRemoto;
      audioRemoto.current.play?.().catch(() => {});
      // El altavoz elegido la última vez. Se aplica aquí y no al montar porque
      // hasta que no hay cinta no hay nada que enrutar.
      const guardado = leerPreferencias().altavoz;
      if (guardado) void sonarPor(audioRemoto.current, guardado);
    }
    if (videoRemoto.current && videoRemoto.current.srcObject !== streamRemoto) {
      videoRemoto.current.srcObject = streamRemoto;
    }
  }, [streamRemoto]);

  useEffect(() => { setAudioListo(audioRemoto.current); }, [llamada?.id]);

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

  // ── PANTALLA COMPLETA DE VERDAD ───────────────────────────────────────────
  // Se manda el navegador, no nosotros: se sale con Escape, con F11 o desde el
  // sistema, y de ninguna de esas tres se entera un `useState`. Por eso el
  // botón refleja `fullscreenElement` en vez de creerse su propia variable —
  // si no, se sale con Escape y el botón sigue diciendo «salir».
  useEffect(() => {
    const mirar = () => setCompleta(document.fullscreenElement === caja.current);
    document.addEventListener('fullscreenchange', mirar);
    return () => document.removeEventListener('fullscreenchange', mirar);
  }, []);

  const alternarCompleta = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (caja.current) { await caja.current.requestFullscreen(); setGrande(true); }
    } catch {
      // iOS no deja pantalla completa sobre un `div` cualquiera. Se queda en
      // «grande», que allí ocupa la pantalla casi entera de todos modos.
      setGrande(true);
    }
  }, []);

  // Al colgar hay que salir de pantalla completa a mano: el elemento
  // desaparece del árbol y el navegador deja la pantalla en negro un instante.
  useEffect(() => {
    if (!llamada && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, [llamada]);

  if (!llamada || (llamada.entrante && llamada.fase === 'sonando')) return null;

  const seVe = llamada.hayVideoRemoto || llamada.camara || llamada.pantalla;
  const segundos = llamada.desde && llamada.fase === 'hablando' ? (ahora - llamada.desde) / 1000 : 0;
  const enMarcha = llamada.fase === 'hablando';

  const pie =
    llamada.fase === 'llamando' ? 'Llamando…'
    : llamada.fase === 'conectando' ? 'Conectando…'
    : reloj(segundos);

  // ── EL AVISO, UNO SOLO Y POR ORDEN DE URGENCIA ────────────────────────────
  // Los cuatro pueden ser ciertos a la vez —la conexión se pone mala justo
  // antes de reconectar, siempre— y cuatro carteles apilados tapan la cara de
  // la persona con la que hablas. Gana el más accionable: primero lo que puedes
  // arreglar tú (tienes el micro cerrado), luego lo que solo puedes esperar.
  const aviso =
    llamada.aviso ? { tono: 'malo' as const, texto: llamada.aviso }
    : llamada.hablasTu && !llamada.micro ? { tono: 'aviso' as const, texto: 'Estás hablando con el micrófono cerrado' }
    : llamada.reconectando ? { tono: 'aviso' as const, texto: 'Se ha perdido la conexión. Recuperándola…' }
    : enMarcha && llamada.calidad === 'mala' ? { tono: 'malo' as const, texto: 'La conexión va mal: puede que no se te oiga entero' }
    : null;

  return (
    <div
      ref={caja}
      role="dialog"
      aria-label={`Llamada con ${llamada.con.nombre}`}
      className={cn(
        'fixed z-[60] overflow-hidden bg-slate-900 text-white shadow-2xl ring-1 ring-slate-800',
        'animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col',
        // En pantalla completa el redondeo sobra: el navegador ya no deja nada
        // detrás y unas esquinas redondeadas dejarían cuatro muescas negras.
        completa ? 'inset-0 rounded-none'
        : grande ? 'inset-2 sm:inset-6 lg:inset-10 rounded-2xl'
        : 'right-3 bottom-3 w-[19rem] sm:w-80 rounded-2xl',
      )}
    >
      {/* LO QUE SE VE DEL OTRO LADO */}
      <div className={cn('relative bg-slate-950 flex-1', grande || completa ? 'min-h-0' : 'h-44')}>
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
              {/* EL HALO DE QUIEN HABLA. En una llamada de voz la pantalla es
                  una inicial quieta: sin esto no hay forma de distinguir que el
                  otro se ha callado de que la llamada se ha caído, y la gente
                  acaba diciendo «¿me oyes?» cada quince segundos. */}
              <span
                className={cn(
                  'inline-block rounded-full transition-all duration-150',
                  llamada.hablaElOtro ? 'ring-4 ring-emerald-400/80 scale-105' : 'ring-4 ring-transparent',
                )}
              >
                <Cara nombre={llamada.con.nombre} avatar={llamada.con.avatar} tam={grande || completa ? 'lg' : 'md'} />
              </span>
              <p className="mt-3 text-sm font-black">{llamada.con.nombre}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1.5">
                {llamada.fase !== 'hablando' && <Loader2 className="w-3 h-3 animate-spin" />}
                {pie}
                {enMarcha && <Cobertura calidad={llamada.calidad} />}
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
            className={cn('absolute rounded-lg object-cover ring-1 ring-white/20 bg-slate-800 transition-all',
              grande || completa ? 'w-40 h-28 right-3 bottom-3' : 'w-20 h-14 right-2 bottom-2',
              // Tu propio halo, para saber que el micro te está cogiendo. Rojo
              // si estás silenciado: ahí el halo significa «esto NO sale».
              llamada.hablasTu && (llamada.micro ? 'ring-2 ring-emerald-400' : 'ring-2 ring-rose-400'),
              !llamada.pantalla && 'scale-x-[-1]')}
          />
        )}

        {/* La barra de arriba: con quién, cuánto, cómo va, y los tamaños. */}
        <div className="absolute inset-x-0 top-0 p-2 flex items-center gap-2 bg-gradient-to-b from-slate-950/80 to-transparent">
          {seVe && (
            <>
              <span
                className={cn(
                  'rounded-full transition-all duration-150 shrink-0',
                  llamada.hablaElOtro ? 'ring-2 ring-emerald-400' : 'ring-2 ring-transparent',
                )}
              >
                <Cara nombre={llamada.con.nombre} avatar={llamada.con.avatar} tam="sm" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black truncate">{llamada.con.nombre}</span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-300">
                  {pie}
                  {enMarcha && <Cobertura calidad={llamada.calidad} />}
                </span>
              </span>
            </>
          )}
          {llamada.pantalla && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-[10px] font-black">
              <ScreenShare className="w-3 h-3" /> Compartiendo
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {/* Pantalla completa solo tiene sentido cuando hay algo que mirar:
                en una llamada de voz agrandaría una inicial gigante. */}
            {seVe && document.fullscreenEnabled && (
              <button
                type="button"
                onClick={alternarCompleta}
                title={completa ? 'Salir de pantalla completa' : 'Pantalla completa'}
                aria-label={completa ? 'Salir de pantalla completa' : 'Pantalla completa'}
                className="w-7 h-7 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {completa ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
              </button>
            )}
            {!completa && (
              <button
                type="button"
                onClick={() => setGrande(g => !g)}
                title={grande ? 'Hacer pequeña' : 'Agrandar'}
                aria-label={grande ? 'Hacer pequeña' : 'Agrandar'}
                className="w-7 h-7 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {grande ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {aviso && (
          <div className="absolute inset-x-0 top-12 flex justify-center px-3 pointer-events-none">
            <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>
          </div>
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
        <MenuAparatos elementoAudio={audioListo} />
        <BotonRedondo icono={PhoneOff} etiqueta="Colgar" tono="colgar" grande onClick={() => { colgar(); }} />
      </div>

      <audio ref={audioRemoto} autoPlay playsInline className="hidden" />
    </div>
  );
}
