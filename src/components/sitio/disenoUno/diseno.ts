import { useEffect, useState } from 'react';

// ============================================================================
// DOS DISEÑOS DE LA PORTADA DE luzhumanidad.com (2026-11-27, Eugenio)
// ============================================================================
// «Una página web de Luz y Humanidad alternativa para probar diferentes diseños: tocando en el logo se puede
// elegir diseño 1 o diseño 2. El diseño 2 es el actual y el diseño 1 el que vamos a hacer ahora desde cero.»
//
// The choice is remembered in this browser (localStorage) and shared across its tabs. `?diseno=1` or `?diseno=2`
// in the address sets it too, so a link can open one design. Default: 2, the home page everyone already knows.
export type Diseno = '1' | '2';
const CLAVE = 'luz-diseno';
const EVENTO = 'luz-diseno';

export function leerDiseno(): Diseno {
  try {
    const q = new URLSearchParams(window.location.search).get('diseno');
    if (q === '1' || q === '2') { window.localStorage.setItem(CLAVE, q); return q; }
    return window.localStorage.getItem(CLAVE) === '1' ? '1' : '2';
  } catch { return '2'; }
}

export function elegirDiseno(d: Diseno) {
  try { window.localStorage.setItem(CLAVE, d); } catch { /* sin almacenamiento: solo esta vez */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: d }));
}

export function useDiseno(): Diseno {
  const [d, setD] = useState<Diseno>(() => (typeof window === 'undefined' ? '2' : leerDiseno()));
  useEffect(() => {
    const oir = (e: Event) => setD(((e as CustomEvent).detail as Diseno) || leerDiseno());
    const oirOtra = () => setD(leerDiseno());
    window.addEventListener(EVENTO, oir); window.addEventListener('storage', oirOtra);
    return () => { window.removeEventListener(EVENTO, oir); window.removeEventListener('storage', oirOtra); };
  }, []);
  return d;
}
