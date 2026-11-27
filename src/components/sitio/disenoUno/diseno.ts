import { useEffect, useState } from 'react';

// ============================================================================
// DOS DISEÑOS DE LA PORTADA DE luzhumanidad.com (2026-11-27, Eugenio)
// ============================================================================
// «Una página web de Luz y Humanidad alternativa para probar diferentes diseños: tocando en el logo se puede
// elegir diseño 1 o diseño 2. El diseño 2 es el actual y el diseño 1 el que vamos a hacer ahora desde cero.»
//
// The choice is remembered in this browser (localStorage) and shared across its tabs. `?diseno=1` or `?diseno=2`
// in the address sets it too, so a link can open one design.
// Default: 1 since 2026-11-27 («haz que por defecto, cuando se cargue la página, se vea el diseño 1»). It was 2 for
// the first hours, and anyone who opened the menu then has '2' saved under the old key 'luz-diseno': that copy would
// outlive the new default, so the key changed and the old one is ignored (and removed). Choices made from now on stick.
export type Diseno = '1' | '2';
const CLAVE = 'luz-diseno-v2';
const CLAVE_ANTIGUA = 'luz-diseno';
const EVENTO = 'luz-diseno';

export function leerDiseno(): Diseno {
  try {
    const q = new URLSearchParams(window.location.search).get('diseno');
    window.localStorage.removeItem(CLAVE_ANTIGUA);
    if (q === '1' || q === '2') { window.localStorage.setItem(CLAVE, q); return q; }
    return window.localStorage.getItem(CLAVE) === '2' ? '2' : '1';
  } catch { return '1'; }
}

export function elegirDiseno(d: Diseno) {
  try { window.localStorage.setItem(CLAVE, d); } catch { /* sin almacenamiento: solo esta vez */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: d }));
}

export function useDiseno(): Diseno {
  const [d, setD] = useState<Diseno>(() => (typeof window === 'undefined' ? '1' : leerDiseno()));
  useEffect(() => {
    const oir = (e: Event) => setD(((e as CustomEvent).detail as Diseno) || leerDiseno());
    const oirOtra = () => setD(leerDiseno());
    window.addEventListener(EVENTO, oir); window.addEventListener('storage', oirOtra);
    return () => { window.removeEventListener(EVENTO, oir); window.removeEventListener('storage', oirOtra); };
  }, []);
  return d;
}
