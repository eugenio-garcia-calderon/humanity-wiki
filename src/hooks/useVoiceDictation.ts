import { useEffect, useRef, useState } from 'react';

// ============================================================================
// Dictado por voz (Fase 12, 2026-08-05) — Web Speech API
// ============================================================================
// Sin dependencias ni backend: el reconocimiento corre en el propio
// navegador (Chrome/Edge lo soportan de forma nativa; Safari/Firefox no —
// `supported` lo refleja para que el botón se oculte). `onResult` recibe el
// texto reconocido según llega (interim) y el final cuando se detiene.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function useVoiceDictation(onResult: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const start = () => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk;
        else interimText += chunk;
      }
      // Las dos, y en este orden (2026-10-02): cuando una frase se cierra y
      // la siguiente ya ha empezado, llegan en el mismo evento. Antes sólo se
      // pasaba la cerrada y lo que se estaba diciendo desaparecía del cuadro
      // hasta la palabra siguiente: el texto no «se iba escribiendo».
      if (finalText) onResult(finalText, true);
      if (interimText) onResult(interimText, false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const toggle = () => (listening ? stop() : start());

  return { listening, supported, toggle };
}
