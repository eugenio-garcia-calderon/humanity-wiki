import { useEffect, useRef, useState } from 'react';

// ============================================================================
// LOS BOTONES 2 Y 3 DEL DICTADO (2026-10-05)
// ============================================================================
// Eugenio, tras tres arreglos del dictado en directo que en su Chrome seguían
// sin escribir nada: «haz diferentes soluciones, pon tres botones y nos
// quedamos con el que mejor funcione».
//
//   1. `useVoiceDictation`: graba con AudioContext y transcribe en directo en
//      el servidor (el de siempre).
//   2. `useDictadoNavegador`: el reconocimiento que trae Chrome. No toca el
//      micrófono por nuestra cuenta: lo abre y lo entiende Chrome, así que no
//      le afecta nada de lo que falle en el 1.
//   3. `useDictadoGrabacion`: graba con MediaRecorder —sin AudioContext— y al
//      soltar sube la grabación entera y vuelve el texto. No es en directo,
//      pero es la vía con menos piezas.
//
// Los tres llaman a `onResult(texto, esFinal)` igual, y los tres mandan a
// `/api/voz/informe` cómo les fue, para saber cuál falla sin depender de que
// nadie lo cuente.

export type MetodoVoz = 1 | 2 | 3;

const CLAVE_MICRO = 'humanity:microfono';

export function informarVoz(datos: Record<string, unknown>) {
  fetch('/api/voz/informe', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...datos, navegador: navigator.userAgent.slice(0, 140) }),
  }).catch(() => null);
}

/** Botón 2: el reconocimiento de voz del propio navegador. */
export function useDictadoNavegador(onResult: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alResultado = useRef(onResult);
  alResultado.current = onResult;
  const rec = useRef<any>(null);
  /** Quiere seguir escuchando: Chrome corta solo tras un silencio, y entonces
   *  se vuelve a arrancar sin que la persona tenga que pulsar otra vez. */
  const quiere = useRef(false);
  const cuenta = useRef({ textos: 0, errores: [] as string[], reinicios: 0, empezo: 0 });

  const Ctor = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const supported = !!Ctor;

  const arrancar = () => {
    const r = new Ctor();
    r.lang = 'es-ES'; r.continuous = true; r.interimResults = true;
    r.onresult = (e: any) => {
      let fin = '', medio = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript; else medio += e.results[i][0].transcript;
      }
      cuenta.current.textos++;
      if (fin) alResultado.current(fin, true);
      if (medio) alResultado.current(medio, false);
    };
    r.onerror = (e: any) => {
      const c = String(e?.error || 'desconocido');
      cuenta.current.errores.push(c);
      // «no-speech» y «aborted» son normales: se sigue.
      if (c === 'no-speech' || c === 'aborted') return;
      quiere.current = false;
      setError(
        c === 'not-allowed' || c === 'service-not-allowed' ? 'El navegador no deja usar el micrófono para dictar. Dale permiso en el candado de la barra de direcciones.'
        : c === 'audio-capture' ? 'El navegador no encuentra el micrófono.'
        : c === 'network' ? 'El dictado de Chrome necesita conexión con Google y no la tiene.'
        : `El dictado del navegador ha fallado (${c}).`);
    };
    r.onend = () => {
      if (quiere.current) { cuenta.current.reinicios++; try { r.start(); return; } catch { /* se cierra abajo */ } }
      setListening(false);
      informarVoz({ metodo: 2, ...cuenta.current, segundos: Math.round((Date.now() - cuenta.current.empezo) / 1000) });
    };
    r.start();
    rec.current = r;
  };

  const start = () => {
    setError(null);
    if (!Ctor) { setError('Este navegador no trae dictado propio. Prueba el botón 1 o el 3.'); return; }
    cuenta.current = { textos: 0, errores: [], reinicios: 0, empezo: Date.now() };
    quiere.current = true;
    try { arrancar(); setListening(true); }
    catch (e: any) { quiere.current = false; setError(`No se ha podido empezar: ${e?.message || e}`); }
  };
  const stop = () => { quiere.current = false; try { rec.current?.stop(); } catch { /* */ } };

  useEffect(() => () => { quiere.current = false; try { rec.current?.abort(); } catch { /* */ } }, []);

  return { listening, supported, error, toggle: () => (listening ? stop() : start()) };
}

/** Botón 3: grabar entero y transcribir al soltar. */
export function useDictadoGrabacion(onResult: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alResultado = useRef(onResult);
  alResultado.current = onResult;
  const parar = useRef<(() => void) | null>(null);

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const start = async () => {
    setError(null);
    if (!supported) { setError('Este navegador no permite grabar audio.'); return; }
    setListening(true);
    let micro = '';
    try { micro = localStorage.getItem(CLAVE_MICRO) || ''; } catch { /* */ }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: micro ? { deviceId: { ideal: micro } } : true });
    } catch (e: any) {
      setListening(false);
      setError(e?.name === 'NotAllowedError' ? 'No hay permiso para el micrófono. Actívalo en el candado de la barra de direcciones.' : 'No encuentro ningún micrófono.');
      informarVoz({ metodo: 3, fallo: `getUserMedia ${e?.name}` });
      return;
    }
    const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const grabadora = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
    const trozos: Blob[] = [];
    grabadora.ondataavailable = e => { if (e.data.size) trozos.push(e.data); };
    const empezo = Date.now();
    const pista = stream.getAudioTracks()[0];
    grabadora.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setListening(false);
      const audio = new Blob(trozos, { type: grabadora.mimeType || tipo || 'audio/webm' });
      const segundos = Math.round((Date.now() - empezo) / 100) / 10;
      const base = { metodo: 3, segundos, kb: Math.round(audio.size / 1024), tipo: audio.type, micro: pista?.label };
      if (audio.size < 1000) { setError('La grabación ha salido vacía.'); informarVoz({ ...base, fallo: 'vacía' }); return; }
      setProcesando(true);
      try {
        const r = await fetch('/api/voz/grabacion', { method: 'POST', credentials: 'include', headers: { 'Content-Type': audio.type }, body: audio });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setError(j.error || 'No se ha podido transcribir.'); informarVoz({ ...base, fallo: `servidor ${r.status}` }); return; }
        if (j.texto) alResultado.current(j.texto, true);
        else setError('No se oye ninguna voz en la grabación. Prueba a elegir otro micrófono en la flechita del botón 1.');
        informarVoz({ ...base, letras: (j.texto || '').length, silencio: !!j.silencio });
      } catch { setError('Se ha cortado la conexión al enviar la grabación.'); }
      finally { setProcesando(false); }
    };
    grabadora.start(1000);
    parar.current = () => { if (grabadora.state !== 'inactive') grabadora.stop(); };
  };
  const stop = () => { parar.current?.(); parar.current = null; };

  useEffect(() => () => { parar.current?.(); }, []);

  return { listening, procesando, supported, error, toggle: () => (listening ? stop() : (procesando ? undefined : start())) };
}
