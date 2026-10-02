import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// DICTADO POR VOZ, EN TIEMPO REAL (2026-10-02)
// ============================================================================
// Eugenio: «el voice to text no funciona en el botón de IA ni en el chat. Que
// aparezca, como en Claude, el texto según se pronuncia, y una pestañita para
// elegir el micrófono».
//
// Antes esto era el reconocimiento del propio navegador (Web Speech): no
// existe en Firefox, falla en la app instalada del iPhone, no deja elegir
// micrófono y, cuando fallaba, callaba. Ahora:
//
//   1. El navegador graba él mismo, con el micrófono elegido
//      (`getUserMedia` con `deviceId`).
//   2. El audio sube al servidor en trozos de 250 ms, en PCM de 16 kHz, y el
//      servidor lo pasa a un transcriptor en tiempo real (`server/voz.ts`).
//   3. El texto vuelve por SSE: la frase en curso («interim») se repinta
//      según se habla, y al cerrarse queda fija («final»).
//
// Si el servidor no puede (sin sesión, sin presupuesto), se usa el de antes
// —Web Speech— donde exista. Y si no hay ninguno, se DICE: `error`.
//
// `onResult(texto, esFinal)` funciona igual que antes, así que quien lo usa
// no cambia: `texto` es la frase en curso entera, y `esFinal` la cierra.

type Reconocedor = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};

export type Microfono = { id: string; nombre: string };

const CLAVE_MICRO = 'humanity:microfono';

/** El procesador que entrega el audio crudo del micrófono, trozo a trozo. */
const CODIGO_CAPTURA = `
class CapturaVoz extends AudioWorkletProcessor {
  process(entradas) { const c = entradas[0] && entradas[0][0]; if (c) this.port.postMessage(c.slice(0)); return true; }
}
registerProcessor('captura-voz', CapturaVoz);`;

/** De la frecuencia del micrófono (44,1 o 48 kHz) a 16 kHz y 16 bits. */
function aPcm16(muestras: Float32Array, origen: number): ArrayBuffer {
  const razon = origen / 16000;
  const n = Math.floor(muestras.length / razon);
  const salida = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    // Media de las muestras que caen en este hueco: un filtro sencillo que
    // evita el pitido que deja quedarse con una de cada tres.
    const a = Math.floor(i * razon), b = Math.min(muestras.length, Math.floor((i + 1) * razon));
    let s = 0; for (let j = a; j < b; j++) s += muestras[j];
    const v = Math.max(-1, Math.min(1, s / Math.max(1, b - a)));
    salida[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return salida.buffer;
}

export function useVoiceDictation(onResult: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Cuánto suena el micrófono ahora mismo, de 0 a 1 (2026-10-02): el botón
   *  lo enseña, y así se ve al momento si llega sonido. */
  const [nivel, setNivel] = useState(0);
  const [microfonos, setMicrofonos] = useState<Microfono[]>([]);
  const [microfono, setMicrofonoState] = useState<string>(() => {
    try { return localStorage.getItem(CLAVE_MICRO) || ''; } catch { return ''; }
  });
  const alResultado = useRef(onResult);
  alResultado.current = onResult;
  const parar = useRef<(() => void) | null>(null);
  /** Sube con cada «para»: un arranque que aún esperaba el permiso o la
   *  conexión ve que ya no es el vigente y se recoge sin grabar nada. */
  const intento = useRef(0);

  useEffect(() => {
    const hayGrabacion = !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== 'undefined';
    const hayNavegador = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSupported(hayGrabacion || hayNavegador);
  }, []);

  /** Los micrófonos que hay. Sus nombres sólo se ven después del primer
   *  permiso: antes salen numerados. */
  const cargarMicrofonos = useCallback(async () => {
    try {
      const todos = await navigator.mediaDevices.enumerateDevices();
      const entradas = todos.filter(d => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
      setMicrofonos(entradas.map((d, i) => ({ id: d.deviceId, nombre: d.label || `Micrófono ${i + 1}` })));
    } catch { setMicrofonos([]); }
  }, []);
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    md.addEventListener('devicechange', cargarMicrofonos);
    return () => md.removeEventListener('devicechange', cargarMicrofonos);
  }, [cargarMicrofonos]);

  const setMicrofono = (id: string) => {
    setMicrofonoState(id);
    try { if (id) localStorage.setItem(CLAVE_MICRO, id); else localStorage.removeItem(CLAVE_MICRO); } catch { /* sin almacenamiento */ }
  };

  /** El de antes: el reconocimiento del navegador. */
  const conNavegador = (): boolean => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return false;
    const r: Reconocedor = new Ctor();
    r.lang = 'es-ES'; r.continuous = true; r.interimResults = true;
    r.onresult = (e: any) => {
      let fin = '', medio = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript; else medio += e.results[i][0].transcript;
      }
      // Las dos, y en este orden: cuando una frase se cierra y la siguiente
      // ya ha empezado, llegan en el mismo evento.
      if (fin) alResultado.current(fin, true);
      if (medio) alResultado.current(medio, false);
    };
    r.onerror = (e: any) => {
      setListening(false);
      setError(e?.error === 'not-allowed' ? 'El navegador no deja usar el micrófono. Dale permiso en la barra de direcciones.' : 'El dictado se ha cortado.');
    };
    r.onend = () => setListening(false);
    r.start();
    parar.current = () => r.stop();
    setListening(true);
    return true;
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
      if (!conNavegador()) setError('Este navegador no permite dictar.');
      return;
    }
    // Azul desde el primer instante: el permiso y la conexión tardan un poco,
    // y un botón que no reacciona hace pulsarlo otra vez.
    setListening(true);
    // ── EL AUDIO SE PREPARA EN EL MISMO CLIC (2026-10-02) ───────────────────
    // Safari (y a veces Chrome) deja PARADO un AudioContext que se crea después
    // de esperar a algo —el permiso del micrófono, la conexión—: ya no cuenta
    // como respuesta al clic. Parado, no entrega ni una muestra y el dictado
    // se queda en blanco sin decir nada. Se crea aquí, antes de cualquier
    // espera, y se despierta en el acto.
    let ctx: AudioContext;
    try { ctx = new AudioContext(); ctx.resume().catch(() => {}); }
    catch { setListening(false); if (!conNavegador()) setError('Este navegador no permite grabar audio.'); return; }
    const soltarCtx = () => { ctx.close().catch(() => {}); };
    const mio = ++intento.current;
    const vigente = () => mio === intento.current;
    // 1. El micrófono, el elegido si sigue conectado.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { ...(microfono ? { deviceId: { ideal: microfono } } : {}), echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e: any) {
      setListening(false);
      soltarCtx();
      setError(e?.name === 'NotAllowedError'
        ? 'No hay permiso para el micrófono. Actívalo en el candado de la barra de direcciones.'
        : 'No encuentro ningún micrófono.');
      return;
    }
    cargarMicrofonos(); // con permiso ya hay nombres
    if (!vigente()) { stream.getTracks().forEach(t => t.stop()); soltarCtx(); return; }

    // 2. La sesión en el servidor. Si no puede, el reconocimiento del navegador.
    const r = await fetch('/api/voz/sesion', { method: 'POST', credentials: 'include' }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok || !j.id) {
      stream.getTracks().forEach(t => t.stop());
      soltarCtx();
      setListening(false);
      if (!conNavegador()) setError(j.error || 'No se ha podido empezar el dictado.');
      return;
    }
    const id: string = j.id;
    if (!vigente()) {
      stream.getTracks().forEach(t => t.stop());
      soltarCtx();
      fetch(`/api/voz/sesion/${id}/fin`, { method: 'POST', credentials: 'include' }).catch(() => null);
      return;
    }

    // 3. El texto, según llega.
    const eventos = new EventSource(`/api/voz/sesion/${id}/eventos`, { withCredentials: true });
    // El servidor manda SIEMPRE el texto entero de esta sesión (ver `voz.ts`):
    // se repinta tal cual, y al terminar se fija una sola vez.
    let ultimo = '';
    let fijado = false;
    const fijar = () => { if (!fijado && ultimo) { fijado = true; alResultado.current(ultimo, true); } };
    eventos.addEventListener('texto', (e: any) => {
      try { ultimo = JSON.parse(e.data).texto || ''; if (!fijado) alResultado.current(ultimo, false); } catch { /* */ }
    });
    eventos.addEventListener('fin', fijar);
    eventos.addEventListener('error', (e: any) => {
      try { const d = JSON.parse(e.data); if (d?.mensaje) setError(d.mensaje); } catch { /* error de red del propio EventSource */ }
    });

    // Si el canal del texto se cae del todo, se dice.
    eventos.onerror = () => { if (eventos.readyState === EventSource.CLOSED && vigente()) setError('Se ha cortado la conexión del dictado. Vuelve a pulsar el micrófono.'); };

    // 4. El audio, en trozos de 250 ms y en orden.
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    const url = URL.createObjectURL(new Blob([CODIGO_CAPTURA], { type: 'application/javascript' }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const fuente = ctx.createMediaStreamSource(stream);
    const nodo = new AudioWorkletNode(ctx, 'captura-voz');
    let trozos: Float32Array[] = [];
    nodo.port.onmessage = e => { trozos.push(e.data as Float32Array); };
    fuente.connect(nodo);
    let cola: Promise<unknown> = Promise.resolve();
    let grabado = 0, maximo = 0, avisadoMudo = false;
    const vaciar = () => {
      if (!trozos.length) return;
      const largo = trozos.reduce((n, t) => n + t.length, 0);
      const junto = new Float32Array(largo);
      let o = 0; for (const t of trozos) { junto.set(t, o); o += t.length; }
      trozos = [];
      // Cuánto suena, para el botón y para saber si el micrófono está mudo.
      let suma = 0; for (let i = 0; i < junto.length; i++) suma += junto[i] * junto[i];
      const rms = Math.sqrt(suma / Math.max(1, junto.length));
      setNivel(Math.min(1, rms * 6));
      grabado += junto.length / ctx.sampleRate;
      if (rms > maximo) maximo = rms;
      // ¿MUDO? Tres segundos sin que llegue nada que suene: el micrófono
      // elegido no es el que se usa, o el sistema no le deja a este navegador.
      // Se dice UNA vez, con qué hacer, en vez de esperar en blanco.
      if (!avisadoMudo && grabado > 3 && maximo < 0.003) {
        avisadoMudo = true;
        setError('No me llega sonido del micrófono. Si tienes varios, elige otro en la flechita de al lado; si no, revisa que el sistema deje a este navegador usar el micrófono.');
      }
      const cuerpo = aPcm16(junto, ctx.sampleRate);
      cola = cola.then(() => fetch(`/api/voz/sesion/${id}/audio`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/octet-stream' }, body: cuerpo,
      }).catch(() => null));
    };
    const reloj = setInterval(vaciar, 250);

    parar.current = () => {
      clearInterval(reloj);
      vaciar();
      fuente.disconnect(); nodo.disconnect();
      stream.getTracks().forEach(t => t.stop());
      soltarCtx();
      setNivel(0);
      // Se avisa del final cuando ya ha salido todo el audio, y se deja el
      // canal abierto un momento para recibir la última frase cerrada.
      cola.then(() => fetch(`/api/voz/sesion/${id}/fin`, { method: 'POST', credentials: 'include' }).catch(() => null));
      eventos.addEventListener('fin', () => eventos.close());
      setTimeout(() => { fijar(); eventos.close(); }, 5000);
    };
    // Si el servidor cierra (5 minutos, o se cayó), el botón deja de estar azul.
    eventos.addEventListener('fin', () => { if (parar.current) { parar.current(); parar.current = null; setListening(false); } });
  };

  const stop = () => {
    intento.current++;
    parar.current?.();
    parar.current = null;
    setListening(false);
  };

  // Al irse de la pantalla, el micrófono se apaga.
  useEffect(() => () => { parar.current?.(); }, []);

  const toggle = () => (listening ? stop() : start());

  return { listening, supported, toggle, error, nivel, microfonos, microfono, setMicrofono, cargarMicrofonos };
}
